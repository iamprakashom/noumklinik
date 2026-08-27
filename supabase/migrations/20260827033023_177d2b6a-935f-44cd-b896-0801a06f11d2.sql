ALTER TABLE public.clinic_profile ADD COLUMN IF NOT EXISTS google_review_link text;

CREATE TABLE IF NOT EXISTS public.patient_feedback (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  rating integer not null,
  comment text,
  is_complaint boolean not null default false,
  review_link_clicked boolean not null default false,
  resolved_at timestamp with time zone,
  resolved_by text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_feedback TO authenticated;
GRANT ALL ON public.patient_feedback TO service_role;

ALTER TABLE public.patient_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic staff manage patient feedback"
ON public.patient_feedback FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'provider'::app_role)
  OR public.has_role(auth.uid(), 'front_desk'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'provider'::app_role)
  OR public.has_role(auth.uid(), 'front_desk'::app_role)
);

CREATE TRIGGER patient_feedback_touch BEFORE UPDATE ON public.patient_feedback
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();