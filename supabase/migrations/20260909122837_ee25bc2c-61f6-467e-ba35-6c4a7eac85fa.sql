ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_reason text,
  ADD COLUMN IF NOT EXISTS override_at timestamptz;

CREATE OR REPLACE FUNCTION public.schedule_recall_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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