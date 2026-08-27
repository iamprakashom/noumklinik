CREATE TABLE public.whatsapp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  display_name text,
  phone_number text,
  phone_number_id text,
  waba_id text,
  access_token text,
  verify_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  app_secret text,
  enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Not connected',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_settings_singleton UNIQUE (singleton)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_settings TO authenticated;
GRANT ALL ON public.whatsapp_settings TO service_role;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic staff manage whatsapp settings" ON public.whatsapp_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'front_desk'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'front_desk'));

CREATE TRIGGER whatsapp_settings_touch BEFORE UPDATE ON public.whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_wa_id text NOT NULL,
  contact_name text,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'outgoing',
  body text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'text',
  status text NOT NULL DEFAULT 'Sent',
  error text,
  provider_message_id text,
  read_at timestamptz,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX whatsapp_messages_contact_idx ON public.whatsapp_messages (contact_wa_id, sent_at DESC);
CREATE INDEX whatsapp_messages_patient_idx ON public.whatsapp_messages (patient_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic staff manage whatsapp messages" ON public.whatsapp_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'front_desk'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'front_desk'));

CREATE TRIGGER whatsapp_messages_touch BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS wa_template_name text,
  ADD COLUMN IF NOT EXISTS wa_language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS wa_category text NOT NULL DEFAULT 'UTILITY',
  ADD COLUMN IF NOT EXISTS wa_status text NOT NULL DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS wa_variables text[] NOT NULL DEFAULT '{}';