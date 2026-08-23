-- Leads enrichment
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS temperature text NOT NULL DEFAULT 'Warm',
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_group text NOT NULL DEFAULT 'Organic';

-- Appointment enrichment
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'Walk-in',
  ADD COLUMN IF NOT EXISTS temperature text NOT NULL DEFAULT 'Warm',
  ADD COLUMN IF NOT EXISTS previous_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS reschedule_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reschedule_reason text;

-- Outbox delivery tracking
ALTER TABLE public.messages_outbox
  ADD COLUMN IF NOT EXISTS provider_message_id text;

-- Service add-ons (upsell)
CREATE TABLE IF NOT EXISTS public.service_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  main_service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  addon_service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (main_service_id, addon_service_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_addons TO authenticated;
GRANT ALL ON public.service_addons TO service_role;
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff only access" ON public.service_addons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['admin'::app_role,'provider'::app_role,'front_desk'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['admin'::app_role,'provider'::app_role,'front_desk'::app_role])));

-- Add-on based discount rules
CREATE TABLE IF NOT EXISTS public.addon_discount_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  main_service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  min_addons integer NOT NULL DEFAULT 1,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addon_discount_rules TO authenticated;
GRANT ALL ON public.addon_discount_rules TO service_role;
ALTER TABLE public.addon_discount_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff only access" ON public.addon_discount_rules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['admin'::app_role,'provider'::app_role,'front_desk'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['admin'::app_role,'provider'::app_role,'front_desk'::app_role])));

-- Single clinic payment gateway connection (admin only; secrets never exposed to non-admins)
CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  provider text NOT NULL DEFAULT 'razorpay',
  mode text NOT NULL DEFAULT 'test',
  key_id text,
  key_secret text,
  webhook_secret text,
  enabled boolean NOT NULL DEFAULT false,
  allow_upi boolean NOT NULL DEFAULT true,
  allow_emi boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_gateway_settings_singleton_chk CHECK (singleton)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateway_settings TO authenticated;
GRANT ALL ON public.payment_gateway_settings TO service_role;
ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage gateway" ON public.payment_gateway_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER payment_gateway_settings_touch BEFORE UPDATE ON public.payment_gateway_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Payment links created with the connected gateway
CREATE TABLE IF NOT EXISTS public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_ref text,
  short_url text,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_links TO authenticated;
GRANT ALL ON public.payment_links TO service_role;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff only access" ON public.payment_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['admin'::app_role,'provider'::app_role,'front_desk'::app_role])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['admin'::app_role,'provider'::app_role,'front_desk'::app_role])));