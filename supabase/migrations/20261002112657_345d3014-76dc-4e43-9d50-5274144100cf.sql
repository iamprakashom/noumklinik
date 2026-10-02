CREATE OR REPLACE FUNCTION public.validate_invoice_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  invoice_row public.invoices%ROWTYPE;
  already_settled numeric;
  incoming_effect numeric;
BEGIN
  SELECT * INTO invoice_row
  FROM public.invoices
  WHERE id = NEW.invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  IF invoice_row.doc_type <> 'invoice' OR invoice_row.status = 'Void' THEN
    RAISE EXCEPTION 'Payments can only be recorded against an active invoice';
  END IF;

  SELECT COALESCE(SUM(CASE WHEN status = 'Refunded' THEN 0 ELSE amount END), 0)
  INTO already_settled
  FROM public.payments
  WHERE invoice_id = NEW.invoice_id
    AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

  incoming_effect := CASE WHEN NEW.status = 'Refunded' THEN 0 ELSE NEW.amount END;
  IF incoming_effect <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;
  IF round(already_settled + incoming_effect, 2) > round(invoice_row.total, 2) THEN
    RAISE EXCEPTION 'Payment exceeds the remaining invoice balance';
  END IF;

  NEW.clinic_id := invoice_row.clinic_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_validate_balance ON public.payments;
CREATE TRIGGER payments_validate_balance
  BEFORE INSERT OR UPDATE OF invoice_id, amount, status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_payment();

CREATE OR REPLACE FUNCTION public.sync_invoice_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_invoice_id uuid;
  invoice_total numeric;
  settled numeric;
BEGIN
  target_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT total INTO invoice_total
  FROM public.invoices
  WHERE id = target_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(CASE WHEN status = 'Refunded' THEN 0 ELSE amount END), 0)
  INTO settled
  FROM public.payments
  WHERE invoice_id = target_invoice_id;

  UPDATE public.invoices
  SET status = CASE WHEN round(settled, 2) >= round(invoice_total, 2) THEN 'Paid' ELSE 'Open' END
  WHERE id = target_invoice_id
    AND doc_type = 'invoice'
    AND status <> 'Void';

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS payments_sync_invoice_status ON public.payments;
CREATE TRIGGER payments_sync_invoice_status
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_status();

CREATE UNIQUE INDEX IF NOT EXISTS payment_links_provider_ref_unique
  ON public.payment_links (provider, provider_ref)
  WHERE provider_ref IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_invoice_payment(
  _invoice_id uuid,
  _amount numeric,
  _method text,
  _paid_at timestamptz,
  _reference text DEFAULT NULL
)
RETURNS TABLE(payment_id uuid, remaining_balance numeric, invoice_status text)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  inserted_id uuid;
  invoice_total numeric;
  settled numeric;
  resulting_status text;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;
  IF NULLIF(trim(_method), '') IS NULL THEN
    RAISE EXCEPTION 'Payment method is required';
  END IF;

  SELECT total INTO invoice_total
  FROM public.invoices
  WHERE id = _invoice_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;

  INSERT INTO public.payments (invoice_id, amount, method, status, paid_at, reference)
  VALUES (_invoice_id, round(_amount, 2), trim(_method), 'Paid', COALESCE(_paid_at, now()), NULLIF(trim(_reference), ''))
  RETURNING id INTO inserted_id;

  SELECT COALESCE(SUM(CASE WHEN status = 'Refunded' THEN 0 ELSE amount END), 0)
  INTO settled
  FROM public.payments
  WHERE invoice_id = _invoice_id;

  resulting_status := CASE WHEN round(settled, 2) >= round(invoice_total, 2) THEN 'Paid' ELSE 'Open' END;
  RETURN QUERY SELECT inserted_id, GREATEST(round(invoice_total - settled, 2), 0), resulting_status;
END;
$$;

REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid, numeric, text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid, numeric, text, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid, numeric, text, timestamptz, text) TO service_role;

CREATE OR REPLACE FUNCTION public.settle_payment_link(
  _provider_ref text,
  _amount numeric,
  _method text
)
RETURNS TABLE(processed boolean, remaining_balance numeric, invoice_status text)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  link_row public.payment_links%ROWTYPE;
  invoice_total numeric;
  settled numeric;
  resulting_status text;
BEGIN
  SELECT * INTO link_row
  FROM public.payment_links
  WHERE provider_ref = _provider_ref
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Payment link not found'; END IF;
  IF link_row.status = 'paid' THEN
    RETURN QUERY SELECT false, 0::numeric, 'Paid'::text;
    RETURN;
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Invalid payment amount'; END IF;
  IF round(_amount, 2) <> round(link_row.amount, 2) THEN
    RAISE EXCEPTION 'Received amount does not match the payment link';
  END IF;

  SELECT total INTO invoice_total
  FROM public.invoices
  WHERE id = link_row.invoice_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;

  INSERT INTO public.payments (clinic_id, invoice_id, amount, method, status, reference)
  VALUES (link_row.clinic_id, link_row.invoice_id, round(_amount, 2), trim(_method), 'Paid', link_row.provider || ':' || link_row.provider_ref);

  UPDATE public.payment_links
  SET status = 'paid', paid_at = now()
  WHERE id = link_row.id;

  SELECT COALESCE(SUM(CASE WHEN status = 'Refunded' THEN 0 ELSE amount END), 0)
  INTO settled
  FROM public.payments
  WHERE invoice_id = link_row.invoice_id;

  resulting_status := CASE WHEN round(settled, 2) >= round(invoice_total, 2) THEN 'Paid' ELSE 'Open' END;
  RETURN QUERY SELECT true, GREATEST(round(invoice_total - settled, 2), 0), resulting_status;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_payment_link(text, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_payment_link(text, numeric, text) FROM anon;
REVOKE ALL ON FUNCTION public.settle_payment_link(text, numeric, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.settle_payment_link(text, numeric, text) TO service_role;