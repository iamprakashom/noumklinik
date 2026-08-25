CREATE TABLE public.meta_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  page_id text NOT NULL,
  page_name text NOT NULL,
  page_picture_url text,
  page_access_token text,
  user_access_token text,
  status text NOT NULL DEFAULT 'connected',
  error_message text,
  last_lead_at timestamptz,
  connected_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX meta_connections_singleton_idx ON public.meta_connections ((singleton)) WHERE singleton;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_connections TO authenticated;
GRANT ALL ON public.meta_connections TO service_role;
REVOKE SELECT (page_access_token, user_access_token) ON public.meta_connections FROM authenticated;

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic staff manage meta connection" ON public.meta_connections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'front_desk'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'front_desk'));

CREATE TRIGGER meta_connections_touch BEFORE UPDATE ON public.meta_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.meta_lead_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.meta_connections(id) ON DELETE CASCADE,
  form_id text NOT NULL,
  form_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  field_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, form_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_lead_forms TO authenticated;
GRANT ALL ON public.meta_lead_forms TO service_role;

ALTER TABLE public.meta_lead_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic staff manage meta lead forms" ON public.meta_lead_forms
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'front_desk'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'front_desk'));

CREATE TRIGGER meta_lead_forms_touch BEFORE UPDATE ON public.meta_lead_forms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS leads_external_id_unique ON public.leads (external_id) WHERE external_id IS NOT NULL;