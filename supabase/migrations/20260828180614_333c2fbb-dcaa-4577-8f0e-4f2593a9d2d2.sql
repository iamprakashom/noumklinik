-- 1. Tenancy tables
CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.clinic_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text,
  full_name text,
  role public.app_role NOT NULL DEFAULT 'front_desk',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_members TO authenticated;
GRANT ALL ON public.clinic_members TO service_role;
ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.clinic_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'front_desk',
  token_hash text NOT NULL,
  invited_by uuid,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinic_invites_token_hash_idx ON public.clinic_invites (token_hash);
CREATE INDEX clinic_invites_email_idx ON public.clinic_invites (lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_invites TO authenticated;
GRANT ALL ON public.clinic_invites TO service_role;
ALTER TABLE public.clinic_invites ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER clinics_touch BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER clinic_members_touch BEFORE UPDATE ON public.clinic_members FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER clinic_invites_touch BEFORE UPDATE ON public.clinic_invites FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Membership helpers (security definer to avoid recursive policy evaluation)
CREATE OR REPLACE FUNCTION public.current_clinic_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT clinic_id FROM public.clinic_members
  WHERE user_id = auth.uid() AND status = 'active'
  ORDER BY created_at
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_member(_clinic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE clinic_id = _clinic_id AND user_id = auth.uid() AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_admin(_clinic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE clinic_id = _clinic_id AND user_id = auth.uid()
      AND status = 'active' AND role = 'admin'
  )
$$;

REVOKE ALL ON FUNCTION public.current_clinic_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_clinic_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_clinic_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_clinic_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_clinic_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_clinic_admin(uuid) TO authenticated, service_role;

-- 3. Policies for tenancy tables
CREATE POLICY "Members read their clinics" ON public.clinics FOR SELECT TO authenticated
  USING (public.is_clinic_member(id));
CREATE POLICY "Anyone signed in can create a clinic" ON public.clinics FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins update their clinic" ON public.clinics FOR UPDATE TO authenticated
  USING (public.is_clinic_admin(id)) WITH CHECK (public.is_clinic_admin(id));

CREATE POLICY "Members read clinic roster" ON public.clinic_members FOR SELECT TO authenticated
  USING (public.is_clinic_member(clinic_id) OR user_id = auth.uid());
CREATE POLICY "Bootstrap own membership" ON public.clinic_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.clinic_members m WHERE m.clinic_id = clinic_members.clinic_id
  ));
CREATE POLICY "Admins manage roster" ON public.clinic_members FOR UPDATE TO authenticated
  USING (public.is_clinic_admin(clinic_id)) WITH CHECK (public.is_clinic_admin(clinic_id));
CREATE POLICY "Admins remove members" ON public.clinic_members FOR DELETE TO authenticated
  USING (public.is_clinic_admin(clinic_id) AND user_id <> auth.uid());

CREATE POLICY "Admins manage invites" ON public.clinic_invites FOR ALL TO authenticated
  USING (public.is_clinic_admin(clinic_id)) WITH CHECK (public.is_clinic_admin(clinic_id));

-- 4. Backfill: one clinic for all existing data
DO $$
DECLARE
  legacy_clinic uuid;
  legacy_name text;
  owner_id uuid;
  t text;
  tables text[] := ARRAY[
    'addon_discount_rules','appointment_requests','appointments','automation_rules','clinic_profile',
    'consent_templates','invoice_items','invoices','leads','message_templates','messages_outbox',
    'meta_connections','meta_lead_forms','package_items','package_redemptions','packages',
    'patient_consents','patient_feedback','patient_links','patient_package_items','patient_packages',
    'patient_photos','patients','payment_gateway_settings','payment_links','payments','providers',
    'rooms','service_addons','services','treatment_records','whatsapp_messages','whatsapp_settings'
  ];
BEGIN
  SELECT COALESCE(trade_name, legal_name) INTO legacy_name FROM public.clinic_profile LIMIT 1;
  SELECT id INTO owner_id FROM auth.users ORDER BY created_at LIMIT 1;

  INSERT INTO public.clinics (name, created_by)
  VALUES (COALESCE(legacy_name, 'My Clinic'), owner_id)
  RETURNING id INTO legacy_clinic;

  INSERT INTO public.clinic_members (clinic_id, user_id, email, role, status)
  SELECT legacy_clinic, u.id, u.email,
         CASE WHEN u.id = owner_id THEN 'admin'::public.app_role
              ELSE COALESCE((SELECT r.role FROM public.user_roles r WHERE r.user_id = u.id ORDER BY r.created_at LIMIT 1), 'front_desk'::public.app_role) END,
         'active'
  FROM auth.users u
  ON CONFLICT (clinic_id, user_id) DO NOTHING;

  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE', t);
    EXECUTE format('UPDATE public.%I SET clinic_id = %L', t, legacy_clinic);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN clinic_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN clinic_id SET DEFAULT public.current_clinic_id()', t);
    EXECUTE format('CREATE INDEX %I ON public.%I (clinic_id)', t || '_clinic_id_idx', t);

    -- replace every existing policy with a clinic-scoped one
    EXECUTE (
      SELECT COALESCE(string_agg(format('DROP POLICY %I ON public.%I;', policyname, t), ' '), '')
      FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    );
    EXECUTE format(
      'CREATE POLICY "Clinic members access" ON public.%I FOR ALL TO authenticated USING (public.is_clinic_member(clinic_id)) WITH CHECK (public.is_clinic_member(clinic_id))', t);
  END LOOP;
END $$;

-- 5. Per-clinic singletons
ALTER TABLE public.clinic_profile DROP CONSTRAINT IF EXISTS clinic_profile_singleton_key;
ALTER TABLE public.whatsapp_settings DROP CONSTRAINT IF EXISTS whatsapp_settings_singleton;
ALTER TABLE public.payment_gateway_settings DROP CONSTRAINT IF EXISTS payment_gateway_settings_singleton_key;
CREATE UNIQUE INDEX clinic_profile_clinic_key ON public.clinic_profile (clinic_id);
CREATE UNIQUE INDEX whatsapp_settings_clinic_key ON public.whatsapp_settings (clinic_id);
CREATE UNIQUE INDEX payment_gateway_settings_clinic_key ON public.payment_gateway_settings (clinic_id);
CREATE UNIQUE INDEX meta_connections_clinic_key ON public.meta_connections (clinic_id);

-- 6. Per-clinic invoice numbering
CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
DECLARE
  pfx text;
BEGIN
  IF NEW.seq IS NULL THEN
    SELECT COALESCE(MAX(seq), 0) + 1 INTO NEW.seq
    FROM public.invoices WHERE clinic_id = NEW.clinic_id;
  END IF;
  SELECT COALESCE(invoice_prefix, 'INV') INTO pfx
  FROM public.clinic_profile WHERE clinic_id = NEW.clinic_id LIMIT 1;
  IF NEW.number IS NULL OR NEW.number = '' OR NEW.number LIKE 'AUTO%' THEN
    NEW.number := COALESCE(pfx, 'INV')
      || CASE WHEN NEW.doc_type = 'credit_note' THEN '-CN-' ELSE '-' END
      || to_char(NEW.issued_at, 'YYYY') || '-'
      || lpad(NEW.seq::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$function$;

-- 7. Roles now come from clinic membership
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role();
DROP TABLE IF EXISTS public.user_roles;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members m
    WHERE m.user_id = _user_id AND m.role = _role AND m.status = 'active'
      AND m.clinic_id = public.current_clinic_id()
  )
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
