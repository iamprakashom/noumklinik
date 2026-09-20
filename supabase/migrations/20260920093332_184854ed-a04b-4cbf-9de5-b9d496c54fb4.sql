INSERT INTO public.provider_branch_assignments (provider_id, clinic_id, active)
SELECT p.id, p.clinic_id, true
FROM public.providers p
WHERE NOT EXISTS (
  SELECT 1 FROM public.provider_branch_assignments a
  WHERE a.provider_id = p.id AND a.clinic_id = p.clinic_id
);