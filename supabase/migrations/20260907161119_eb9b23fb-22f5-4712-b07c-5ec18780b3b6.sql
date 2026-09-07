ALTER TABLE public.clinic_profile
  ADD COLUMN IF NOT EXISTS working_days text[] NOT NULL DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri','Sat']::text[],
  ADD COLUMN IF NOT EXISTS open_time text NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS close_time text NOT NULL DEFAULT '19:00';