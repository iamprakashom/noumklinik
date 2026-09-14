CREATE TABLE public.inbox_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE DEFAULT public.current_clinic_id(),
  channel text NOT NULL CHECK (channel IN ('whatsapp','messenger','instagram')),
  provider_account_id text NOT NULL,
  provider_parent_id text,
  display_name text,
  username text,
  picture_url text,
  status text NOT NULL DEFAULT 'disconnected',
  enabled boolean NOT NULL DEFAULT false,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  last_checked_at timestamptz,
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, channel, provider_account_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_connections TO authenticated;
GRANT ALL ON public.inbox_connections TO service_role;
ALTER TABLE public.inbox_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic staff view inbox connections" ON public.inbox_connections
  FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id));
CREATE POLICY "Clinic admins create inbox connections" ON public.inbox_connections
  FOR INSERT TO authenticated WITH CHECK (public.is_clinic_admin(clinic_id));
CREATE POLICY "Clinic admins update inbox connections" ON public.inbox_connections
  FOR UPDATE TO authenticated USING (public.is_clinic_admin(clinic_id)) WITH CHECK (public.is_clinic_admin(clinic_id));
CREATE POLICY "Clinic admins delete inbox connections" ON public.inbox_connections
  FOR DELETE TO authenticated USING (public.is_clinic_admin(clinic_id));
CREATE INDEX inbox_connections_clinic_channel_idx ON public.inbox_connections (clinic_id, channel, status);
CREATE TRIGGER inbox_connections_touch BEFORE UPDATE ON public.inbox_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.inbox_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE DEFAULT public.current_clinic_id(),
  connection_id uuid REFERENCES public.inbox_connections(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','messenger','instagram')),
  provider_conversation_id text NOT NULL,
  provider_customer_id text NOT NULL,
  customer_name text,
  customer_username text,
  customer_avatar_url text,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  last_message text NOT NULL DEFAULT '',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_direction text NOT NULL DEFAULT 'incoming',
  unread_count integer NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  reply_window_expires_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, channel, provider_conversation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_conversations TO authenticated;
GRANT ALL ON public.inbox_conversations TO service_role;
ALTER TABLE public.inbox_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic staff manage inbox conversations" ON public.inbox_conversations
  FOR ALL TO authenticated USING (public.is_clinic_member(clinic_id)) WITH CHECK (public.is_clinic_member(clinic_id));
CREATE INDEX inbox_conversations_latest_idx ON public.inbox_conversations (clinic_id, last_message_at DESC, id DESC);
CREATE INDEX inbox_conversations_unread_idx ON public.inbox_conversations (clinic_id, channel, unread_count, last_message_at DESC);
CREATE TRIGGER inbox_conversations_touch BEFORE UPDATE ON public.inbox_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE DEFAULT public.current_clinic_id(),
  conversation_id uuid NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  legacy_whatsapp_message_id uuid,
  provider_message_id text,
  direction text NOT NULL CHECK (direction IN ('incoming','outgoing')),
  body text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'text',
  attachment jsonb,
  status text NOT NULL DEFAULT 'Received',
  error text,
  provider_sent_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_messages TO authenticated;
GRANT ALL ON public.inbox_messages TO service_role;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic staff manage inbox messages" ON public.inbox_messages
  FOR ALL TO authenticated USING (public.is_clinic_member(clinic_id)) WITH CHECK (public.is_clinic_member(clinic_id));
CREATE UNIQUE INDEX inbox_messages_provider_key ON public.inbox_messages (clinic_id, provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE UNIQUE INDEX inbox_messages_legacy_wa_key ON public.inbox_messages (legacy_whatsapp_message_id) WHERE legacy_whatsapp_message_id IS NOT NULL;
CREATE INDEX inbox_messages_thread_idx ON public.inbox_messages (conversation_id, provider_sent_at DESC, id DESC);
CREATE TRIGGER inbox_messages_touch BEFORE UPDATE ON public.inbox_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.meta_connections
  ADD COLUMN instagram_account_id text,
  ADD COLUMN instagram_username text,
  ADD COLUMN instagram_picture_url text,
  ADD COLUMN messenger_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN instagram_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN messaging_status text NOT NULL DEFAULT 'disconnected',
  ADD COLUMN messaging_error text,
  ADD COLUMN messaging_connected_at timestamptz;

INSERT INTO public.inbox_connections
  (clinic_id, channel, provider_account_id, provider_parent_id, display_name, status, enabled, capabilities, connected_at)
SELECT clinic_id, 'whatsapp', COALESCE(phone_number_id, id::text), waba_id,
       COALESCE(display_name, phone_number),
       CASE WHEN status = 'Connected' THEN 'connected' ELSE lower(status) END,
       enabled,
       jsonb_build_object('text', true, 'templates', true),
       CASE WHEN status = 'Connected' THEN updated_at ELSE NULL END
FROM public.whatsapp_settings
ON CONFLICT (clinic_id, channel, provider_account_id) DO NOTHING;

INSERT INTO public.inbox_conversations
  (clinic_id, connection_id, channel, provider_conversation_id, provider_customer_id,
   customer_name, patient_id, lead_id, last_message, last_message_at, last_direction,
   unread_count, reply_window_expires_at)
SELECT DISTINCT ON (m.clinic_id, m.contact_wa_id)
  m.clinic_id, c.id, 'whatsapp', m.contact_wa_id, m.contact_wa_id,
  m.contact_name, m.patient_id, m.lead_id, m.body, m.sent_at, m.direction,
  (SELECT count(*) FROM public.whatsapp_messages u
    WHERE u.clinic_id = m.clinic_id AND u.contact_wa_id = m.contact_wa_id
      AND u.direction = 'incoming' AND u.read_at IS NULL),
  (SELECT max(i.sent_at) + interval '24 hours' FROM public.whatsapp_messages i
    WHERE i.clinic_id = m.clinic_id AND i.contact_wa_id = m.contact_wa_id AND i.direction = 'incoming')
FROM public.whatsapp_messages m
LEFT JOIN public.inbox_connections c
  ON c.clinic_id = m.clinic_id AND c.channel = 'whatsapp'
ORDER BY m.clinic_id, m.contact_wa_id, m.sent_at DESC, m.id DESC
ON CONFLICT (clinic_id, channel, provider_conversation_id) DO NOTHING;

INSERT INTO public.inbox_messages
  (clinic_id, conversation_id, legacy_whatsapp_message_id, provider_message_id, direction,
   body, message_type, status, error, provider_sent_at, read_at, created_at, updated_at)
SELECT m.clinic_id, c.id, m.id, m.provider_message_id, m.direction,
       m.body, m.message_type, m.status, m.error, m.sent_at, m.read_at, m.created_at, m.updated_at
FROM public.whatsapp_messages m
JOIN public.inbox_conversations c
  ON c.clinic_id = m.clinic_id AND c.channel = 'whatsapp'
 AND c.provider_conversation_id = m.contact_wa_id
ON CONFLICT DO NOTHING;