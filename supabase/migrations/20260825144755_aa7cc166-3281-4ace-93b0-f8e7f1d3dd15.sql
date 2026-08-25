ALTER TABLE public.meta_lead_forms
  ADD COLUMN IF NOT EXISTS field_confidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS confirmed_keys text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_apply boolean NOT NULL DEFAULT true;