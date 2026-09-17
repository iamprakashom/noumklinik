ALTER TABLE public.clinic_members ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL;
ALTER TABLE public.clinic_members ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
ALTER TABLE public.clinic_invites ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS clinic_members_provider_unique ON public.clinic_members(clinic_id, provider_id) WHERE provider_id IS NOT NULL;

CREATE TABLE public.user_clinic_preferences (
  user_id uuid PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_clinic_preferences TO authenticated;
GRANT ALL ON public.user_clinic_preferences TO service_role;
ALTER TABLE public.user_clinic_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own clinic preference" ON public.user_clinic_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.is_clinic_member(clinic_id));

CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read clinic activity" ON public.activity_log FOR SELECT TO authenticated USING (public.is_clinic_admin(clinic_id));
CREATE POLICY "Members create own activity" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() AND public.is_clinic_member(clinic_id));
CREATE INDEX activity_log_clinic_created_idx ON public.activity_log(clinic_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.current_clinic_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.clinic_id
  FROM public.clinic_members m
  LEFT JOIN public.user_clinic_preferences p ON p.user_id = auth.uid() AND p.clinic_id = m.clinic_id
  WHERE m.user_id = auth.uid() AND m.status = 'active'
  ORDER BY (p.clinic_id IS NOT NULL) DESC, m.created_at
  LIMIT 1
$$;

DROP POLICY IF EXISTS "Clinic members access" ON public.treatment_records;
CREATE POLICY "Clinical team read records" ON public.treatment_records FOR SELECT TO authenticated USING (public.is_clinic_admin(clinic_id) OR public.has_role(auth.uid(), 'provider'));
CREATE POLICY "Clinical team create records" ON public.treatment_records FOR INSERT TO authenticated WITH CHECK (public.is_clinic_admin(clinic_id) OR public.has_role(auth.uid(), 'provider'));
CREATE POLICY "Clinical team update records" ON public.treatment_records FOR UPDATE TO authenticated USING (public.is_clinic_admin(clinic_id) OR public.has_role(auth.uid(), 'provider')) WITH CHECK (public.is_clinic_admin(clinic_id) OR public.has_role(auth.uid(), 'provider'));
CREATE POLICY "Admins delete records" ON public.treatment_records FOR DELETE TO authenticated USING (public.is_clinic_admin(clinic_id));

DROP POLICY IF EXISTS "Clinic members access" ON public.patient_photos;
CREATE POLICY "Clinical team read photos" ON public.patient_photos FOR SELECT TO authenticated USING (public.is_clinic_admin(clinic_id) OR public.has_role(auth.uid(), 'provider'));
CREATE POLICY "Clinical team create photos" ON public.patient_photos FOR INSERT TO authenticated WITH CHECK (public.is_clinic_admin(clinic_id) OR public.has_role(auth.uid(), 'provider'));
CREATE POLICY "Clinical team update photos" ON public.patient_photos FOR UPDATE TO authenticated USING (public.is_clinic_admin(clinic_id) OR public.has_role(auth.uid(), 'provider')) WITH CHECK (public.is_clinic_admin(clinic_id) OR public.has_role(auth.uid(), 'provider'));
CREATE POLICY "Admins delete photos" ON public.patient_photos FOR DELETE TO authenticated USING (public.is_clinic_admin(clinic_id));

DROP POLICY IF EXISTS "Clinic members access" ON public.services;
CREATE POLICY "Members read services" ON public.services FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id));
CREATE POLICY "Admins create services" ON public.services FOR INSERT TO authenticated WITH CHECK (public.is_clinic_admin(clinic_id));
CREATE POLICY "Admins update services" ON public.services FOR UPDATE TO authenticated USING (public.is_clinic_admin(clinic_id)) WITH CHECK (public.is_clinic_admin(clinic_id));
CREATE POLICY "Admins delete services" ON public.services FOR DELETE TO authenticated USING (public.is_clinic_admin(clinic_id));

DROP POLICY IF EXISTS "Clinic members access" ON public.packages;
CREATE POLICY "Members read packages" ON public.packages FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id));
CREATE POLICY "Admins create packages" ON public.packages FOR INSERT TO authenticated WITH CHECK (public.is_clinic_admin(clinic_id));
CREATE POLICY "Admins update packages" ON public.packages FOR UPDATE TO authenticated USING (public.is_clinic_admin(clinic_id)) WITH CHECK (public.is_clinic_admin(clinic_id));
CREATE POLICY "Admins delete packages" ON public.packages FOR DELETE TO authenticated USING (public.is_clinic_admin(clinic_id));