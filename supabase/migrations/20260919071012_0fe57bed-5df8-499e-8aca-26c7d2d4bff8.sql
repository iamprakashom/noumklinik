CREATE TABLE public.provider_branch_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, clinic_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_branch_assignments TO authenticated;
GRANT ALL ON public.provider_branch_assignments TO service_role;
ALTER TABLE public.provider_branch_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Branch staff read doctor assignments" ON public.provider_branch_assignments
  FOR SELECT TO authenticated
  USING (
    public.is_clinic_member(clinic_id)
    OR public.is_organization_owner((SELECT c.organization_id FROM public.clinics c WHERE c.id = clinic_id))
  );
CREATE POLICY "Owners and admins manage doctor assignments" ON public.provider_branch_assignments
  FOR ALL TO authenticated
  USING (
    public.is_clinic_admin(clinic_id)
    OR public.is_organization_owner((SELECT c.organization_id FROM public.clinics c WHERE c.id = clinic_id))
  )
  WITH CHECK (
    public.is_clinic_admin(clinic_id)
    OR public.is_organization_owner((SELECT c.organization_id FROM public.clinics c WHERE c.id = clinic_id))
  );
CREATE INDEX provider_branch_assignments_clinic_idx ON public.provider_branch_assignments(clinic_id, active);
CREATE INDEX provider_branch_assignments_provider_idx ON public.provider_branch_assignments(provider_id, active);
CREATE TRIGGER provider_branch_assignments_touch BEFORE UPDATE ON public.provider_branch_assignments
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.provider_branch_assignments (provider_id, clinic_id)
SELECT id, clinic_id FROM public.providers
ON CONFLICT (provider_id, clinic_id) DO NOTHING;

CREATE POLICY "Organization owners read group appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (public.is_organization_owner((SELECT c.organization_id FROM public.clinics c WHERE c.id = clinic_id)));
CREATE POLICY "Organization owners read group invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (public.is_organization_owner((SELECT c.organization_id FROM public.clinics c WHERE c.id = clinic_id)));
CREATE POLICY "Organization owners read group payments" ON public.payments
  FOR SELECT TO authenticated
  USING (public.is_organization_owner((SELECT c.organization_id FROM public.clinics c WHERE c.id = clinic_id)));
CREATE POLICY "Organization owners read group invoice items" ON public.invoice_items
  FOR SELECT TO authenticated
  USING (public.is_organization_owner((SELECT c.organization_id FROM public.clinics c WHERE c.id = clinic_id)));
CREATE POLICY "Organization owners read group providers" ON public.providers
  FOR SELECT TO authenticated
  USING (public.is_organization_owner((SELECT c.organization_id FROM public.clinics c WHERE c.id = clinic_id)));
CREATE POLICY "Organization owners read group package redemptions" ON public.package_redemptions
  FOR SELECT TO authenticated
  USING (public.is_organization_owner((SELECT c.organization_id FROM public.clinics c WHERE c.id = clinic_id)));
CREATE POLICY "Organization owners read group patient packages" ON public.patient_packages
  FOR SELECT TO authenticated
  USING (public.is_organization_owner((SELECT c.organization_id FROM public.clinics c WHERE c.id = clinic_id)));
CREATE POLICY "Organization owners read group feedback" ON public.patient_feedback
  FOR SELECT TO authenticated
  USING (public.is_organization_owner((SELECT c.organization_id FROM public.clinics c WHERE c.id = clinic_id)));

CREATE OR REPLACE FUNCTION public.provider_has_group_conflict(
  _provider_id uuid,
  _starts_at timestamptz,
  _duration_min integer,
  _exclude_appointment_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.providers p ON p.id = _provider_id
    JOIN public.clinics pc ON pc.id = p.clinic_id
    JOIN public.clinics ac ON ac.id = a.clinic_id
    WHERE a.provider_id = _provider_id
      AND ac.organization_id = pc.organization_id
      AND a.status NOT IN ('Cancelled', 'No-show')
      AND (_exclude_appointment_id IS NULL OR a.id <> _exclude_appointment_id)
      AND a.starts_at < (_starts_at + make_interval(mins => _duration_min))
      AND (a.starts_at + make_interval(mins => a.duration_min)) > _starts_at
  )
$$;
REVOKE ALL ON FUNCTION public.provider_has_group_conflict(uuid, timestamptz, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provider_has_group_conflict(uuid, timestamptz, integer, uuid) TO authenticated, service_role;