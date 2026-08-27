ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS default_product text,
  ADD COLUMN IF NOT EXISTS default_units numeric,
  ADD COLUMN IF NOT EXISTS default_device_settings text,
  ADD COLUMN IF NOT EXISTS consent_template_id uuid REFERENCES public.consent_templates(id) ON DELETE SET NULL;

ALTER TABLE public.treatment_records
  ADD COLUMN IF NOT EXISTS addendum text,
  ADD COLUMN IF NOT EXISTS addendum_by text,
  ADD COLUMN IF NOT EXISTS addendum_at timestamptz;

ALTER TABLE public.patient_consents
  ADD COLUMN IF NOT EXISTS signature_data text,
  ADD COLUMN IF NOT EXISTS signed_via text NOT NULL DEFAULT 'In clinic';

CREATE TABLE IF NOT EXISTS public.patient_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'intake',
  consent_template_id uuid REFERENCES public.consent_templates(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_links TO authenticated;
GRANT ALL ON public.patient_links TO service_role;

ALTER TABLE public.patient_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic staff manage patient links" ON public.patient_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'front_desk'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'front_desk'));

CREATE TRIGGER patient_links_touch BEFORE UPDATE ON public.patient_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS patient_links_token_idx ON public.patient_links(token);