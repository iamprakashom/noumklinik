CREATE OR REPLACE FUNCTION public.payment_effect(_amount numeric, _status text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _amount < 0 AND _status IN ('Paid', 'Refunded') THEN _amount
    WHEN _amount > 0 AND _status = 'Paid' THEN _amount
    ELSE 0
  END
$$;

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
  SELECT * INTO invoice_row FROM public.invoices WHERE id = NEW.invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF invoice_row.doc_type <> 'invoice' THEN
    RAISE EXCEPTION 'Payments can only be recorded against an invoice';
  END IF;
  IF NEW.amount IS NULL OR NEW.amount = 0 THEN
    RAISE EXCEPTION 'Payment amount cannot be zero';
  END IF;

  SELECT COALESCE(SUM(public.payment_effect(amount, status)), 0) INTO already_settled
  FROM public.payments
  WHERE invoice_id = NEW.invoice_id AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

  incoming_effect := public.payment_effect(NEW.amount, NEW.status);
  IF incoming_effect > 0 AND invoice_row.status = 'Void' THEN
    RAISE EXCEPTION 'Payments can only be recorded against an active invoice';
  END IF;
  IF incoming_effect > 0 AND round(already_settled + incoming_effect, 2) > round(invoice_row.total, 2) THEN
    RAISE EXCEPTION 'Payment exceeds the remaining invoice balance';
  END IF;
  IF incoming_effect < 0 AND round(already_settled + incoming_effect, 2) < 0 THEN
    RAISE EXCEPTION 'Refund exceeds the amount collected';
  END IF;

  NEW.clinic_id := invoice_row.clinic_id;
  RETURN NEW;
END;
$$;

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
  SELECT total INTO invoice_total FROM public.invoices WHERE id = target_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(public.payment_effect(amount, status)), 0) INTO settled
  FROM public.payments WHERE invoice_id = target_invoice_id;

  UPDATE public.invoices
  SET status = CASE WHEN round(settled, 2) >= round(invoice_total, 2) THEN 'Paid' ELSE 'Open' END
  WHERE id = target_invoice_id AND doc_type = 'invoice' AND status <> 'Void';

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_invoice_payment(
  _invoice_id uuid, _amount numeric, _method text, _paid_at timestamptz, _reference text DEFAULT NULL
)
RETURNS TABLE(payment_id uuid, remaining_balance numeric, invoice_status text)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  inserted_id uuid;
  invoice_total numeric;
  settled numeric;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be greater than zero'; END IF;
  IF NULLIF(trim(_method), '') IS NULL THEN RAISE EXCEPTION 'Payment method is required'; END IF;

  SELECT total INTO invoice_total FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;

  INSERT INTO public.payments (invoice_id, amount, method, status, paid_at, reference)
  VALUES (_invoice_id, round(_amount, 2), trim(_method), 'Paid', COALESCE(_paid_at, now()), NULLIF(trim(_reference), ''))
  RETURNING id INTO inserted_id;

  SELECT COALESCE(SUM(public.payment_effect(amount, status)), 0) INTO settled
  FROM public.payments WHERE invoice_id = _invoice_id;

  RETURN QUERY SELECT inserted_id,
    GREATEST(round(invoice_total - settled, 2), 0),
    CASE WHEN round(settled, 2) >= round(invoice_total, 2) THEN 'Paid' ELSE 'Open' END;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_payment_link(_provider_ref text, _amount numeric, _method text)
RETURNS TABLE(processed boolean, remaining_balance numeric, invoice_status text)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  link_row public.payment_links%ROWTYPE;
  invoice_total numeric;
  settled numeric;
BEGIN
  SELECT * INTO link_row FROM public.payment_links WHERE provider_ref = _provider_ref FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment link not found'; END IF;
  IF link_row.status = 'paid' THEN
    RETURN QUERY SELECT false, 0::numeric, 'Paid'::text;
    RETURN;
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Invalid payment amount'; END IF;
  IF round(_amount, 2) <> round(link_row.amount, 2) THEN
    RAISE EXCEPTION 'Received amount does not match the payment link';
  END IF;

  SELECT total INTO invoice_total FROM public.invoices WHERE id = link_row.invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;

  INSERT INTO public.payments (clinic_id, invoice_id, amount, method, status, reference)
  VALUES (link_row.clinic_id, link_row.invoice_id, round(_amount, 2), trim(_method), 'Paid', link_row.provider || ':' || link_row.provider_ref);

  UPDATE public.payment_links SET status = 'paid', paid_at = now() WHERE id = link_row.id;

  SELECT COALESCE(SUM(public.payment_effect(amount, status)), 0) INTO settled
  FROM public.payments WHERE invoice_id = link_row.invoice_id;

  RETURN QUERY SELECT true,
    GREATEST(round(invoice_total - settled, 2), 0),
    CASE WHEN round(settled, 2) >= round(invoice_total, 2) THEN 'Paid' ELSE 'Open' END;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_credit_note(_invoice_id uuid, _reason text)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  original public.invoices%ROWTYPE;
  note_id uuid;
BEGIN
  IF NULLIF(trim(_reason), '') IS NULL THEN RAISE EXCEPTION 'A reason is required'; END IF;

  SELECT * INTO original FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF original.doc_type <> 'invoice' THEN RAISE EXCEPTION 'Only a tax invoice can be credited'; END IF;
  IF original.status = 'Void' THEN RAISE EXCEPTION 'This invoice is already cancelled'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.invoices WHERE original_invoice_id = _invoice_id AND doc_type = 'credit_note'
  ) THEN RAISE EXCEPTION 'A credit note already exists for this invoice'; END IF;

  INSERT INTO public.invoices (
    clinic_id, patient_id, appointment_id, number, status, doc_type, original_invoice_id,
    subtotal, discount, taxable_value, cgst, sgst, igst, tax, round_off, total,
    supplier_gstin, place_of_supply, place_of_supply_code, notes
  ) VALUES (
    original.clinic_id, original.patient_id, original.appointment_id, 'AUTO', 'Paid', 'credit_note', original.id,
    -original.subtotal, -original.discount, -original.taxable_value, -original.cgst, -original.sgst,
    -original.igst, -original.tax, -original.round_off, -original.total,
    original.supplier_gstin, original.place_of_supply, original.place_of_supply_code, trim(_reason)
  ) RETURNING id INTO note_id;

  INSERT INTO public.invoice_items (
    clinic_id, invoice_id, description, quantity, unit_price, amount, sac_code, gst_rate,
    taxable_amount, cgst, sgst, igst
  )
  SELECT clinic_id, note_id, description, quantity, unit_price, -amount, sac_code, gst_rate,
         -taxable_amount, -cgst, -sgst, -igst
  FROM public.invoice_items WHERE invoice_id = original.id;

  UPDATE public.invoices SET status = 'Void' WHERE id = original.id;
  RETURN note_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_credit_note(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_credit_note(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_credit_note(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_credit_note(uuid, text) TO service_role;