-- Drop old music CRM
DROP TABLE IF EXISTS public.deliverables CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.people CASCADE;

-- Roles
CREATE TYPE public.app_role AS ENUM ('admin','provider','front_desk');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Providers
CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL DEFAULT 'Aesthetician',
  email text,
  phone text,
  color text NOT NULL DEFAULT 'teal',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.providers TO authenticated;
GRANT ALL ON public.providers TO service_role;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage providers" ON public.providers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Rooms
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'Treatment',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage rooms" ON public.rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Services
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Injectables',
  duration_min integer NOT NULL DEFAULT 30,
  price numeric(10,2) NOT NULL DEFAULT 0,
  followup_days integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage services" ON public.services FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Patients
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  birth_date date,
  gender text,
  source text NOT NULL DEFAULT 'Walk-in',
  tags text[] NOT NULL DEFAULT '{}',
  allergies text,
  alerts text,
  notes text,
  preferred_channel text NOT NULL DEFAULT 'Email',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage patients" ON public.patients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER patients_touch BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Appointments
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  duration_min integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'Booked',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage appointments" ON public.appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER appointments_touch BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX appointments_starts_at_idx ON public.appointments (starts_at);

-- Treatment records
CREATE TABLE public.treatment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  product text,
  units numeric(10,2),
  device_settings text,
  subjective text,
  objective text,
  assessment text,
  plan text,
  signed_by text,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_records TO authenticated;
GRANT ALL ON public.treatment_records TO service_role;
ALTER TABLE public.treatment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage treatment records" ON public.treatment_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER treatment_records_touch BEFORE UPDATE ON public.treatment_records FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Photos
CREATE TABLE public.patient_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  treatment_record_id uuid REFERENCES public.treatment_records(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  kind text NOT NULL DEFAULT 'before',
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_photos TO authenticated;
GRANT ALL ON public.patient_photos TO service_role;
ALTER TABLE public.patient_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage patient photos" ON public.patient_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Consents
CREATE TABLE public.consent_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  body text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_templates TO authenticated;
GRANT ALL ON public.consent_templates TO service_role;
ALTER TABLE public.consent_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage consent templates" ON public.consent_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.patient_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.consent_templates(id) ON DELETE SET NULL,
  template_name text NOT NULL,
  signature_name text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_consents TO authenticated;
GRANT ALL ON public.patient_consents TO service_role;
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage patient consents" ON public.patient_consents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Billing
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  number text NOT NULL,
  status text NOT NULL DEFAULT 'Draft',
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  issued_at date NOT NULL DEFAULT (now()::date),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER invoices_touch BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage invoice items" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'Card',
  status text NOT NULL DEFAULT 'Paid',
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Leads
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  source text NOT NULL DEFAULT 'Manual',
  interest text,
  stage text NOT NULL DEFAULT 'New',
  owner_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  notes text,
  external_id text,
  converted_patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage leads" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER leads_touch BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Messaging
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'Email',
  subject text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage message templates" ON public.message_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL,
  offset_hours integer NOT NULL DEFAULT 0,
  channel text NOT NULL DEFAULT 'Email',
  template_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT ALL ON public.automation_rules TO service_role;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage automation rules" ON public.automation_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER automation_rules_touch BEFORE UPDATE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.messages_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'Email',
  recipient text,
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'Queued',
  error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages_outbox TO authenticated;
GRANT ALL ON public.messages_outbox TO service_role;
ALTER TABLE public.messages_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage outbox" ON public.messages_outbox FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX messages_outbox_sched_idx ON public.messages_outbox (status, scheduled_for);
CREATE UNIQUE INDEX messages_outbox_rule_appt_idx ON public.messages_outbox (rule_id, appointment_id) WHERE appointment_id IS NOT NULL AND rule_id IS NOT NULL;

-- Seed data
INSERT INTO public.providers (id, name, title, email, color) VALUES
 ('11111111-1111-4111-8111-111111111101','Dr. Elena Marsh','Medical Director','elena@lumaclinic.com','teal'),
 ('11111111-1111-4111-8111-111111111102','Priya Nair, RN','Nurse Injector','priya@lumaclinic.com','sage'),
 ('11111111-1111-4111-8111-111111111103','Marco Silva','Laser Technician','marco@lumaclinic.com','sand');

INSERT INTO public.rooms (id, name, kind) VALUES
 ('22222222-2222-4222-8222-222222222201','Suite 1','Treatment'),
 ('22222222-2222-4222-8222-222222222202','Suite 2','Treatment'),
 ('22222222-2222-4222-8222-222222222203','Laser Bay','Device');

INSERT INTO public.services (id, name, category, duration_min, price, followup_days) VALUES
 ('33333333-3333-4333-8333-333333333301','Botox — Upper Face','Injectables',30,420,14),
 ('33333333-3333-4333-8333-333333333302','Dermal Filler — Lips','Injectables',45,650,14),
 ('33333333-3333-4333-8333-333333333303','HydraFacial','Facials',60,180,30),
 ('33333333-3333-4333-8333-333333333304','Laser Hair Removal','Laser',45,240,42),
 ('33333333-3333-4333-8333-333333333305','Microneedling RF','Devices',60,520,28),
 ('33333333-3333-4333-8333-333333333306','New Patient Consultation','Consultation',30,0,3);

INSERT INTO public.patients (id, first_name, last_name, email, phone, birth_date, gender, source, tags, allergies, alerts, preferred_channel) VALUES
 ('44444444-4444-4444-8444-444444444401','Amara','Okafor','amara.okafor@example.com','+1 415 555 0132','1989-04-12','Female','Instagram','{"VIP","Botox"}','None','Prefers afternoon visits','WhatsApp'),
 ('44444444-4444-4444-8444-444444444402','Julia','Bennett','julia.bennett@example.com','+1 415 555 0177','1994-11-02','Female','Meta Ads','{"Filler"}','Lidocaine sensitivity',NULL,'SMS'),
 ('44444444-4444-4444-8444-444444444403','Sofia','Ramos','sofia.ramos@example.com','+1 415 555 0198','1982-07-21','Female','Referral','{"Laser","Membership"}','None',NULL,'Email'),
 ('44444444-4444-4444-8444-444444444404','Daniel','Kim','daniel.kim@example.com','+1 415 555 0110','1991-01-30','Male','Walk-in','{"New"}',NULL,NULL,'Email'),
 ('44444444-4444-4444-8444-444444444405','Hannah','Weiss','hannah.weiss@example.com','+1 415 555 0143','1978-09-08','Female','Google','{"VIP"}','Latex allergy','Latex allergy — use nitrile','SMS');

INSERT INTO public.appointments (id, patient_id, provider_id, room_id, service_id, starts_at, duration_min, status, notes) VALUES
 ('55555555-5555-4555-8555-555555555501','44444444-4444-4444-8444-444444444401','11111111-1111-4111-8111-111111111101','22222222-2222-4222-8222-222222222201','33333333-3333-4333-8333-333333333301', date_trunc('day', now()) + interval '9 hours', 30,'Confirmed','Glabella + crows feet'),
 ('55555555-5555-4555-8555-555555555502','44444444-4444-4444-8444-444444444402','11111111-1111-4111-8111-111111111102','22222222-2222-4222-8222-222222222202','33333333-3333-4333-8333-333333333302', date_trunc('day', now()) + interval '10 hours 30 minutes', 45,'Checked-in','Second syringe'),
 ('55555555-5555-4555-8555-555555555503','44444444-4444-4444-8444-444444444403','11111111-1111-4111-8111-111111111103','22222222-2222-4222-8222-222222222203','33333333-3333-4333-8333-333333333304', date_trunc('day', now()) + interval '13 hours', 45,'Booked','Session 3 of 6'),
 ('55555555-5555-4555-8555-555555555504','44444444-4444-4444-8444-444444444404','11111111-1111-4111-8111-111111111101','22222222-2222-4222-8222-222222222201','33333333-3333-4333-8333-333333333306', date_trunc('day', now()) + interval '15 hours', 30,'Booked','First visit'),
 ('55555555-5555-4555-8555-555555555505','44444444-4444-4444-8444-444444444405','11111111-1111-4111-8111-111111111102','22222222-2222-4222-8222-222222222202','33333333-3333-4333-8333-333333333303', date_trunc('day', now()) + interval '1 day 11 hours', 60,'Booked',NULL),
 ('55555555-5555-4555-8555-555555555506','44444444-4444-4444-8444-444444444401','11111111-1111-4111-8111-111111111101','22222222-2222-4222-8222-222222222201','33333333-3333-4333-8333-333333333301', date_trunc('day', now()) - interval '20 days' + interval '10 hours', 30,'Completed','Baseline treatment');

INSERT INTO public.treatment_records (patient_id, appointment_id, provider_id, service_name, product, units, subjective, objective, assessment, plan, signed_by, signed_at) VALUES
 ('44444444-4444-4444-8444-444444444401','55555555-5555-4555-8555-555555555506','11111111-1111-4111-8111-111111111101','Botox — Upper Face','Botox Cosmetic',24,'Patient reports deep frown lines.','Glabellar rhytids at rest, moderate.','Good candidate for neuromodulator.','24u glabella + crows feet. Review in 2 weeks.','Dr. Elena Marsh', now() - interval '20 days');

INSERT INTO public.consent_templates (id, name, body) VALUES
 ('66666666-6666-4666-8666-666666666601','Neuromodulator (Botox) Consent','I consent to treatment with botulinum toxin. Risks discussed include bruising, asymmetry, ptosis, and headache. Results are temporary and typically last 3-4 months.'),
 ('66666666-6666-4666-8666-666666666602','Dermal Filler Consent','I consent to hyaluronic acid dermal filler treatment. Risks discussed include swelling, bruising, nodules, and rare vascular occlusion.'),
 ('66666666-6666-4666-8666-666666666603','Laser Treatment Consent','I consent to laser treatment. Risks include redness, blistering, pigment change. I agree to avoid sun exposure before and after treatment.');

INSERT INTO public.patient_consents (patient_id, template_id, template_name, signature_name, signed_at) VALUES
 ('44444444-4444-4444-8444-444444444401','66666666-6666-4666-8666-666666666601','Neuromodulator (Botox) Consent','Amara Okafor', now() - interval '20 days');

INSERT INTO public.invoices (id, patient_id, appointment_id, number, status, subtotal, discount, tax, total, issued_at) VALUES
 ('77777777-7777-4777-8777-777777777701','44444444-4444-4444-8444-444444444401','55555555-5555-4555-8555-555555555506','INV-1001','Paid',420,0,34.65,454.65,(now() - interval '20 days')::date),
 ('77777777-7777-4777-8777-777777777702','44444444-4444-4444-8444-444444444402','55555555-5555-4555-8555-555555555502','INV-1002','Open',650,50,49.50,649.50,(now())::date);

INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price, amount) VALUES
 ('77777777-7777-4777-8777-777777777701','Botox — Upper Face (24u)',1,420,420),
 ('77777777-7777-4777-8777-777777777702','Dermal Filler — Lips',1,650,650);

INSERT INTO public.payments (invoice_id, amount, method, status, paid_at) VALUES
 ('77777777-7777-4777-8777-777777777701',454.65,'Card','Paid', now() - interval '20 days');

INSERT INTO public.leads (full_name, email, phone, source, interest, stage, owner_id, notes) VALUES
 ('Nina Patel','nina.patel@example.com','+1 415 555 0221','Meta Lead Ads','Lip filler','New','11111111-1111-4111-8111-111111111102','Auto-captured from Instagram lead form'),
 ('Chris Doyle','chris.doyle@example.com','+1 415 555 0233','Meta Lead Ads','Laser hair removal','Contacted','11111111-1111-4111-8111-111111111103','Called, asked for evening slot'),
 ('Mei Lin','mei.lin@example.com','+1 415 555 0244','Website','Skin consultation','Consult booked','11111111-1111-4111-8111-111111111101',NULL),
 ('Robert Sanz','robert.sanz@example.com','+1 415 555 0255','Referral','Botox','Lost',NULL,'Went with another clinic');

INSERT INTO public.message_templates (id, name, channel, subject, body) VALUES
 ('88888888-8888-4888-8888-888888888801','Appointment reminder (24h)','SMS',NULL,'Hi {{first_name}}, this is Luma Aesthetics reminding you of your {{service}} appointment tomorrow at {{time}}. Reply C to confirm.'),
 ('88888888-8888-4888-8888-888888888802','Appointment reminder (2h)','WhatsApp',NULL,'Hi {{first_name}} — see you at {{time}} today for your {{service}}. Our address: 24 Marlow St.'),
 ('88888888-8888-4888-8888-888888888803','Post-treatment day 3 check-in','Email','How are you feeling, {{first_name}}?','Hi {{first_name}}, it has been a few days since your {{service}} with {{provider}}. Any questions about aftercare? Just reply here.'),
 ('88888888-8888-4888-8888-888888888804','Two-week review booking','Email','Time for your {{service}} review','Hi {{first_name}}, your two-week review for {{service}} is due. Book a slot that suits you.'),
 ('88888888-8888-4888-8888-888888888805','No-show win-back','SMS',NULL,'Hi {{first_name}}, we missed you at your {{service}} appointment. Reply BOOK and we will find you a new time.'),
 ('88888888-8888-4888-8888-888888888806','New lead welcome','WhatsApp',NULL,'Hi {{first_name}}, thanks for your interest in {{interest}} at Luma Aesthetics. Would you like a free consultation this week?');

INSERT INTO public.automation_rules (name, trigger_type, offset_hours, channel, template_id, enabled) VALUES
 ('24h appointment reminder','before_appointment',-24,'SMS','88888888-8888-4888-8888-888888888801',true),
 ('2h appointment reminder','before_appointment',-2,'WhatsApp','88888888-8888-4888-8888-888888888802',true),
 ('Day 3 aftercare check-in','after_treatment',72,'Email','88888888-8888-4888-8888-888888888803',true),
 ('Two-week review recall','after_treatment',336,'Email','88888888-8888-4888-8888-888888888804',true),
 ('No-show win-back','no_show',24,'SMS','88888888-8888-4888-8888-888888888805',true),
 ('New lead welcome','new_lead',0,'WhatsApp','88888888-8888-4888-8888-888888888806',true);

INSERT INTO public.messages_outbox (patient_id, appointment_id, channel, recipient, subject, body, status, scheduled_for, sent_at) VALUES
 ('44444444-4444-4444-8444-444444444405','55555555-5555-4555-8555-555555555505','SMS','+1 415 555 0143',NULL,'Hi Hannah, this is Luma Aesthetics reminding you of your HydraFacial appointment tomorrow at 11:00.','Queued', now() + interval '4 hours', NULL),
 ('44444444-4444-4444-8444-444444444401',NULL,'Email','amara.okafor@example.com','How are you feeling, Amara?','Hi Amara, it has been a few days since your Botox — Upper Face with Dr. Elena Marsh. Any questions about aftercare?','Sent', now() - interval '17 days', now() - interval '17 days');