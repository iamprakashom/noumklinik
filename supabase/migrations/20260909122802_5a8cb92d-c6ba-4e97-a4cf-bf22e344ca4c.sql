ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reference text;

CREATE TABLE IF NOT EXISTS public.patient_recalls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id),
  service_name text NOT NULL DEFAULT '',
  source_appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  booked_appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  due_on date NOT NULL,
  status text NOT NULL DEFAULT 'Due',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_recalls TO authenticated;
GRANT ALL ON public.patient_recalls TO service_role;

ALTER TABLE public.patient_recalls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members access" ON public.patient_recalls
  FOR ALL TO authenticated
  USING (public.is_clinic_member(clinic_id))
  WITH CHECK (public.is_clinic_member(clinic_id));

CREATE TRIGGER patient_recalls_touch
  BEFORE UPDATE ON public.patient_recalls
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS patient_recalls_clinic_due_idx
  ON public.patient_recalls (clinic_id, status, due_on);

CREATE OR REPLACE FUNCTION public.schedule_recall_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s record;
BEGIN
  IF NEW.status <> 'Completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'Completed' THEN RETURN NEW; END IF;
  IF NEW.service_id IS NULL THEN RETURN NEW; END IF;

  SELECT id, name, followup_days INTO s
  FROM public.services WHERE id = NEW.service_id;

  IF s.followup_days IS NULL OR s.followup_days <= 0 THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.patient_recalls
    WHERE patient_id = NEW.patient_id
      AND service_id = NEW.service_id
      AND status = 'Due'
  ) THEN RETURN NEW; END IF;

  INSERT INTO public.patient_recalls
    (clinic_id, patient_id, service_id, service_name, source_appointment_id, due_on, status)
  VALUES
    (NEW.clinic_id, NEW.patient_id, NEW.service_id, s.name, NEW.id,
     (NEW.starts_at AT TIME ZONE 'Asia/Kolkata')::date + s.followup_days, 'Due');

  RETURN NEW;
END;
$$;

CREATE TRIGGER appointments_schedule_recall
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.schedule_recall_on_completion();