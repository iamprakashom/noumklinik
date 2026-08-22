
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','provider','front_desk')
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM public, anon;

DO $$
DECLARE t text;
DECLARE p text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'appointments','automation_rules','consent_templates','invoice_items','invoices',
    'leads','message_templates','messages_outbox','patient_consents','patient_photos',
    'patients','payments','providers','rooms','services','treatment_records'
  ] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p, t);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY "Staff only access" ON public.%I FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', t);
  END LOOP;
END $$;

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
