CREATE OR REPLACE FUNCTION private.current_organization_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.organization_id
  FROM public.clinics c
  WHERE c.id = private.current_clinic_id()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT private.current_organization_id()
$$;
REVOKE ALL ON FUNCTION public.current_organization_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_organization_id() TO authenticated, service_role;

ALTER TABLE public.patients ALTER COLUMN organization_id SET DEFAULT public.current_organization_id();
ALTER TABLE public.patients ALTER COLUMN home_clinic_id SET DEFAULT public.current_clinic_id();

DROP POLICY IF EXISTS "Anyone signed in can create a clinic" ON public.clinics;
CREATE POLICY "Owners create branches or bootstrap clinic" ON public.clinics
  FOR INSERT TO authenticated WITH CHECK (
    created_by = auth.uid()
    AND (
      public.is_organization_owner(organization_id)
      OR NOT EXISTS (
        SELECT 1 FROM public.clinic_members cm
        WHERE cm.user_id = auth.uid() AND cm.status = 'active'
      )
    )
  );