ALTER TABLE public.patient_recalls
  ALTER COLUMN clinic_id SET DEFAULT public.current_clinic_id();