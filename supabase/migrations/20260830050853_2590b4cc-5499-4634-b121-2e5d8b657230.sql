ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_number_unique;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_clinic_number_unique UNIQUE (clinic_id, number);

CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  pfx text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('invoice_seq:' || NEW.clinic_id::text));

  IF NEW.seq IS NULL THEN
    SELECT COALESCE(MAX(seq), 0) + 1 INTO NEW.seq
    FROM public.invoices WHERE clinic_id = NEW.clinic_id;
  END IF;

  SELECT COALESCE(invoice_prefix, 'INV') INTO pfx
  FROM public.clinic_profile WHERE clinic_id = NEW.clinic_id LIMIT 1;

  IF NEW.number IS NULL OR NEW.number = '' OR NEW.number LIKE 'AUTO%' THEN
    NEW.number := COALESCE(pfx, 'INV')
      || CASE WHEN NEW.doc_type = 'credit_note' THEN '-CN-' ELSE '-' END
      || to_char(NEW.issued_at, 'YYYY') || '-'
      || lpad(NEW.seq::text, 5, '0');
  END IF;

  WHILE EXISTS (
    SELECT 1 FROM public.invoices
    WHERE clinic_id = NEW.clinic_id AND number = NEW.number
  ) LOOP
    NEW.seq := NEW.seq + 1;
    NEW.number := COALESCE(pfx, 'INV')
      || CASE WHEN NEW.doc_type = 'credit_note' THEN '-CN-' ELSE '-' END
      || to_char(NEW.issued_at, 'YYYY') || '-'
      || lpad(NEW.seq::text, 5, '0');
  END LOOP;

  RETURN NEW;
END;
$function$;