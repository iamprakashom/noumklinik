ALTER TABLE public.package_items
ADD COLUMN gap_days integer NULL;

ALTER TABLE public.patient_package_items
ADD COLUMN gap_days integer NULL;

ALTER TABLE public.package_items
ADD CONSTRAINT package_items_gap_days_positive
CHECK (gap_days IS NULL OR gap_days > 0);

ALTER TABLE public.patient_package_items
ADD CONSTRAINT patient_package_items_gap_days_positive
CHECK (gap_days IS NULL OR gap_days > 0);