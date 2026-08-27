CREATE TABLE public.clinic_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  legal_name text NOT NULL DEFAULT 'Luma Aesthetics Clinic',
  trade_name text,
  gstin text,
  address_line1 text,
  address_line2 text,
  city text,
  state text NOT NULL DEFAULT 'Karnataka',
  state_code text NOT NULL DEFAULT '29',
  pincode text,
  phone text,
  email text,
  invoice_prefix text NOT NULL DEFAULT 'INV',
  declaration text NOT NULL DEFAULT 'We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_profile TO authenticated;
GRANT ALL ON public.clinic_profile TO service_role;
ALTER TABLE public.clinic_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read clinic profile" ON public.clinic_profile FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','provider','front_desk')));
CREATE POLICY "Admins manage clinic profile" ON public.clinic_profile FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE TRIGGER clinic_profile_touch BEFORE UPDATE ON public.clinic_profile
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.clinic_profile (singleton) VALUES (true);

ALTER TABLE public.services
  ADD COLUMN sac_code text NOT NULL DEFAULT '999722',
  ADD COLUMN gst_rate numeric NOT NULL DEFAULT 18;

ALTER TABLE public.invoices
  ADD COLUMN doc_type text NOT NULL DEFAULT 'invoice',
  ADD COLUMN original_invoice_id uuid REFERENCES public.invoices(id),
  ADD COLUMN seq integer,
  ADD COLUMN supplier_gstin text,
  ADD COLUMN place_of_supply text,
  ADD COLUMN place_of_supply_code text,
  ADD COLUMN taxable_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN cgst numeric NOT NULL DEFAULT 0,
  ADD COLUMN sgst numeric NOT NULL DEFAULT 0,
  ADD COLUMN igst numeric NOT NULL DEFAULT 0,
  ADD COLUMN round_off numeric NOT NULL DEFAULT 0,
  ADD COLUMN notes text;

ALTER TABLE public.invoice_items
  ADD COLUMN sac_code text NOT NULL DEFAULT '999722',
  ADD COLUMN gst_rate numeric NOT NULL DEFAULT 18,
  ADD COLUMN taxable_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN cgst numeric NOT NULL DEFAULT 0,
  ADD COLUMN sgst numeric NOT NULL DEFAULT 0,
  ADD COLUMN igst numeric NOT NULL DEFAULT 0;

ALTER TABLE public.patients ADD COLUMN state text;

CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1;
GRANT USAGE, SELECT ON SEQUENCE public.invoice_seq TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  pfx text;
BEGIN
  IF NEW.seq IS NULL THEN
    NEW.seq := nextval('public.invoice_seq');
  END IF;
  SELECT COALESCE(invoice_prefix,'INV') INTO pfx FROM public.clinic_profile LIMIT 1;
  IF NEW.number IS NULL OR NEW.number = '' OR NEW.number LIKE 'AUTO%' THEN
    NEW.number := COALESCE(pfx,'INV')
      || CASE WHEN NEW.doc_type = 'credit_note' THEN '-CN-' ELSE '-' END
      || to_char(NEW.issued_at, 'YYYY') || '-'
      || lpad(NEW.seq::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invoices_assign_number BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_number();

ALTER TABLE public.invoices ADD CONSTRAINT invoices_number_unique UNIQUE (number);