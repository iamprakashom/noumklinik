
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'appointments','automation_rules','consent_templates','invoice_items','invoices',
    'leads','message_templates','messages_outbox','patient_consents','patient_photos',
    'patients','payments','providers','rooms','services','treatment_records'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Staff only access" ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY "Staff only access" ON public.%I FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','provider','front_desk')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','provider','front_desk')))
    $f$, t);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.is_staff(uuid);
