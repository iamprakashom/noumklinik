CREATE OR REPLACE FUNCTION public.set_catalog_organization()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.clinic_id IS NOT NULL THEN
    SELECT c.organization_id INTO NEW.organization_id FROM public.clinics c WHERE c.id = NEW.clinic_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS services_set_organization ON public.services;
CREATE TRIGGER services_set_organization BEFORE INSERT ON public.services
FOR EACH ROW EXECUTE FUNCTION public.set_catalog_organization();

DROP TRIGGER IF EXISTS packages_set_organization ON public.packages;
CREATE TRIGGER packages_set_organization BEFORE INSERT ON public.packages
FOR EACH ROW EXECUTE FUNCTION public.set_catalog_organization();

UPDATE public.services s
SET organization_id = c.organization_id
FROM public.clinics c
WHERE s.clinic_id = c.id AND s.organization_id IS NULL;

UPDATE public.packages p
SET organization_id = c.organization_id
FROM public.clinics c
WHERE p.clinic_id = c.id AND p.organization_id IS NULL;