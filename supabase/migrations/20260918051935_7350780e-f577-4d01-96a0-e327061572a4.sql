-- Multi-branch foundation: organizations sit above existing clinic rows (branches).
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text,
  full_name text,
  role text NOT NULL DEFAULT 'central_ops' CHECK (role IN ('owner', 'central_ops')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX organization_members_user_idx ON public.organization_members(user_id, status);

ALTER TABLE public.clinics
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN branch_code text,
  ADD COLUMN active boolean NOT NULL DEFAULT true;

-- Backfill one organization per existing clinic, preserving all clinic IDs and history.
INSERT INTO public.organizations (id, name, created_by, created_at, updated_at)
SELECT id, name, created_by, created_at, updated_at FROM public.clinics
ON CONFLICT (id) DO NOTHING;

UPDATE public.clinics SET organization_id = id WHERE organization_id IS NULL;
ALTER TABLE public.clinics ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX clinics_organization_idx ON public.clinics(organization_id, active);
CREATE UNIQUE INDEX clinics_org_branch_code_unique
  ON public.clinics(organization_id, lower(branch_code)) WHERE branch_code IS NOT NULL;

INSERT INTO public.organization_members (organization_id, user_id, email, full_name, role, status)
SELECT DISTINCT ON (c.organization_id, m.user_id)
  c.organization_id, m.user_id, m.email, m.full_name,
  CASE WHEN m.role = 'admin' THEN 'owner' ELSE 'central_ops' END,
  m.status
FROM public.clinic_members m
JOIN public.clinics c ON c.id = m.clinic_id
ORDER BY c.organization_id, m.user_id, CASE WHEN m.role = 'admin' THEN 0 ELSE 1 END
ON CONFLICT (organization_id, user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.is_organization_member(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = _organization_id
      AND om.user_id = auth.uid() AND om.status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.clinic_members cm
    JOIN public.clinics c ON c.id = cm.clinic_id
    WHERE c.organization_id = _organization_id
      AND cm.user_id = auth.uid() AND cm.status = 'active' AND c.active
  )
$$;

CREATE OR REPLACE FUNCTION private.is_organization_owner(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = _organization_id
      AND om.user_id = auth.uid() AND om.status = 'active' AND om.role = 'owner'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_organization_member(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT private.is_organization_member(_organization_id)
$$;
CREATE OR REPLACE FUNCTION public.is_organization_owner(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT private.is_organization_owner(_organization_id)
$$;
REVOKE ALL ON FUNCTION public.is_organization_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_organization_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_organization_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_organization_owner(uuid) TO authenticated, service_role;

CREATE POLICY "Organization members read organization" ON public.organizations
  FOR SELECT TO authenticated USING (public.is_organization_member(id));
CREATE POLICY "Owners update organization" ON public.organizations
  FOR UPDATE TO authenticated USING (public.is_organization_owner(id)) WITH CHECK (public.is_organization_owner(id));
CREATE POLICY "Signed in users create organization" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Organization members read roster" ON public.organization_members
  FOR SELECT TO authenticated USING (public.is_organization_member(organization_id));
CREATE POLICY "Owners manage organization roster" ON public.organization_members
  FOR ALL TO authenticated USING (public.is_organization_owner(organization_id)) WITH CHECK (public.is_organization_owner(organization_id));

DROP POLICY IF EXISTS "Members read their clinics" ON public.clinics;
DROP POLICY IF EXISTS "Admins update their clinic" ON public.clinics;
CREATE POLICY "Members read their branches" ON public.clinics
  FOR SELECT TO authenticated USING (public.is_clinic_member(id) OR public.is_organization_owner(organization_id));
CREATE POLICY "Owners update their branches" ON public.clinics
  FOR UPDATE TO authenticated USING (public.is_clinic_admin(id) OR public.is_organization_owner(organization_id))
  WITH CHECK (public.is_clinic_admin(id) OR public.is_organization_owner(organization_id));

-- Shared patient identity across branches in one organization.
ALTER TABLE public.patients
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN home_clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;
UPDATE public.patients p
SET organization_id = c.organization_id, home_clinic_id = p.clinic_id
FROM public.clinics c
WHERE c.id = p.clinic_id AND p.organization_id IS NULL;
ALTER TABLE public.patients ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX patients_organization_idx ON public.patients(organization_id, created_at DESC);
CREATE INDEX patients_org_phone_idx ON public.patients(organization_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX patients_org_email_idx ON public.patients(organization_id, lower(email)) WHERE email IS NOT NULL;

DROP POLICY IF EXISTS "Clinic members access" ON public.patients;
CREATE POLICY "Organization staff read shared patients" ON public.patients
  FOR SELECT TO authenticated USING (public.is_organization_member(organization_id));
CREATE POLICY "Branch staff create shared patients" ON public.patients
  FOR INSERT TO authenticated WITH CHECK (
    public.is_clinic_member(clinic_id)
    AND organization_id = (SELECT c.organization_id FROM public.clinics c WHERE c.id = clinic_id)
  );
CREATE POLICY "Organization staff update shared patients" ON public.patients
  FOR UPDATE TO authenticated USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));
CREATE POLICY "Organization owners delete shared patients" ON public.patients
  FOR DELETE TO authenticated USING (public.is_organization_owner(organization_id));

CREATE TRIGGER organizations_touch BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER organization_members_touch BEFORE UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();