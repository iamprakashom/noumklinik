# Billing & Reports — accounting review and fixes

I reviewed the billing screen, the reports screen and the actual invoice and payment records in the database. The numbers are not fabricated, but several totals are calculated in ways an accountant would call wrong, and two screens disagree with each other.

## What is actually wrong

**1. "Outstanding" on Billing ignores part payments**
It adds the full value of every invoice still marked Open. If a patient has paid half, the full amount is still shown as due. The Reports "Outstanding dues" tab does it correctly, so the two screens can show different figures for the same day.

**2. Refunds are treated inconsistently**
Billing ignores payments marked Refunded when working out what is settled. Reports counts them as money received, so a refunded invoice can look paid there. On the day-close tab a refund also gets added inside its payment mode row while being subtracted from the total line, so the mode rows do not add up to the total shown beneath them.

**3. Cancelled (Void) invoices are still counted**
Void invoices are excluded from GST working, but they are still included in day-close "Billed", in outstanding dues and in doctor/service revenue. Only credit notes are filtered out.

**4. A ₹0 invoice with no treatment lines exists in the records**
Invoice INV-2026-00003 dated 15 Sep was saved with no line items and zero value. It inflates the invoice count, the document-series summary for the CA, and the billing list. Nothing currently stops an empty invoice from being saved.

**5. Credit notes never reduce the original invoice**
A credit note is recorded as its own document but the invoice it cancels keeps its full balance in the dues list.

**6. Package revenue is counted twice**
Revenue counts the invoice raised when a package is sold, and then counts the value of each session again when the patient uses it. The doctor and service revenue figures are overstated for any clinic selling packages.

**7. Revenue attribution by service is coarse**
An invoice is attributed entirely to the single service on its linked appointment; invoices with no appointment all land in "Other". Multi-treatment invoices are therefore credited to one treatment.

**8. Cash basis and accrual basis are mixed without labels**
Day close counts money received on a date. Doctor/service revenue counts invoices raised in a period, whether collected or not. Both are valid, but nothing on screen says which is which, which is how the figures start to look contradictory.

## What I will change

1. Outstanding on Billing becomes total invoiced minus settled, matching the dues report, and excludes Void invoices and credit notes.
2. One shared settlement rule used by both screens: refunded payments never count as received; negative amounts count as refunds.
3. Day close: refunds shown on their own line, mode rows reconciled so they sum exactly to the total; Void invoices excluded from "Billed".
4. Block saving an invoice with no line items or zero value; flag the existing ₹0 invoice so it can be voided.
5. Credit notes offset the invoice they reference, so the dues list shows the true balance.
6. Exclude package-sale invoices from revenue and keep only session redemptions, so package income is counted once, at the time the treatment is delivered.
7. Attribute revenue line by line where the invoice has line items, rather than assigning the whole invoice to one service.
8. Label each report clearly as "money received" or "invoiced value", and add a short reconciliation line under day close (opening bills raised, collected, refunded, balance carried).

## Technical notes

- Shared helpers in `src/lib/clinic-data.ts` (or a new `src/lib/billing-math.ts`) for settled amount, invoice balance and document filters, consumed by `src/routes/_authenticated/billing.tsx`, `src/routes/_authenticated/reports.tsx` and `src/components/clinic/GstFilingTab.tsx`.
- Revenue attribution reads `invoice_items` instead of the appointment's single `service_id`; package-sale invoices identified via `patient_packages.invoice_id`.
- Credit-note offsetting uses `invoices.original_invoice_id`.
- Empty-invoice guard in the invoice dialog plus a server-side check in the create-invoice mutation.
- Unit tests for the settlement and attribution helpers alongside the existing `src/lib/clinic-data.test.ts`.
- No schema change required.
