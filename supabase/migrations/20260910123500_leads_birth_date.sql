-- Add optional birth_date to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS birth_date date;
