# Clinic owner review — what's missing in Noum Klinik

I went through the whole app as if I were running a dermatology/aesthetic practice on it. The core loop — leads, appointments, charts, packages, GST billing, payments, reminders, inbox, roles — is genuinely solid. Below is what a clinic owner would still hit in daily running, in priority order.

## 2. No waitlist, no deposits, no no-show consequence

- A cancelled Friday laser slot goes empty because nobody tracks who wanted it. A simple waitlist per treatment, with a one-tap "offer this slot" message, recovers real revenue.
- High-value bookings (laser packages, injectables) have no booking deposit. There is no way to take a token amount at booking and adjust it in the final bill.
- No-show is only a status. There is no per-patient no-show count visible at booking time and no rule such as "3rd no-show requires prepayment".

## 3. No consumables / stock tracking at all

For a skin clinic this is the biggest commercial blind spot after schedules:

- botulinum and filler vials: no batch number, expiry, or opening date
- no record of how many units came out of which vial, so vial wastage is invisible
- peels, needles, PRP kits, consumables: no stock, no reorder alert
- no batch/lot traceability, which is an actual safety and audit requirement for injectables

**Proposal (phase 1, deliberately small):** an item list with stock on hand, batch and expiry; deduct on treatment record (units already captured); low-stock and near-expiry alerts; a simple usage-vs-billed variance report.

## 4. Money controls that an owner asks for and cannot get

- **Expenses are not recorded anywhere.** Day close shows only money in. There is no rent, salary, consumable purchase, or petty cash, so there is no real daily or monthly profit figure.
- **Discounts have no approval.** Any user with billing access can discount any amount; nothing flags or routes it. A discount reason plus a threshold above which an admin must approve would close this.
- **Advances exist only as prepaid packages.** A plain "patient paid ₹X in advance" is not representable.

## 5. Audit trail exists but only covers the team screen

`activity_log` is in place and the Activity screen reads it, but only three events are ever written: invite created, role changed, member removed. Nothing is logged for cancelled appointments, voided invoices, credit notes, refunds, price changes, clinical note edits, or patient photo access — which are exactly the ones a clinic owner disputes with staff. The table and screen are already there; this is mostly wiring the existing mutation paths.

## 6. Clinical depth for a dermatology practice

- **No treatment protocol templates.** Every laser or peel course is typed fresh. A protocol (6 sessions, 21-day gap, standard settings, standard aftercare) that pre-fills the note and the recall would save the doctor real time. Packages already carry session gaps — protocols are the clinical twin of that.
- **No prescription output.** Doctors write it on paper or a separate app. A simple prescription on clinic letterhead, printable and WhatsApp-able, is standard expectation.
- **Aftercare exists only as a reminder message**, not as instructions attached to the treatment and given to the patient.
- **Medical history is a single free-text allergy box.** No current medications, no skin type (Fitzpatrick), no pregnancy/breastfeeding flag, no keloid/isotretinoin history — all of which change whether a laser or peel is safe. These should be structured and visible as a red banner at the top of the chart.
- **Photo consent is not separate from general consent.** Before/after photos are stored, but there is no explicit "may we use this for marketing" permission — a real legal exposure the day you post results.

## 7. Duplicate patients are detected but cannot be merged

The app warns "potential duplicate patient" but offers no merge. Over time the same patient exists two or three times with history split across records, which quietly corrupts recalls, packages and revenue per patient.

## 8. Exports and owner-level numbers

- Only the GST tab can export. Patients, appointments, invoices, payments and leads have no CSV, so the owner cannot hand anything to an accountant or a marketing agency without screenshots.
- Reports cover day close, dues, doctor/service revenue, feedback, cancellations and GST — all operational. Missing the owner view: revenue trend month-on-month, new vs repeat patients, patient retention and lifetime value, lead source to revenue (marketing spend vs return), average bill value, chair/room utilisation.

## Suggested order

1. Doctor schedules and leave, plus waitlist — fixes the everyday front-desk mess.
2. Consumables with batch and expiry — safety, wastage and money at once.
3. Expenses, discount reason and approval, booking deposits — the owner's P&L.
4. Complete the audit trail on the existing table.
5. Structured medical history with a safety banner, photo consent, protocols, prescriptions.
6. Patient merge, CSV exports, owner dashboard metrics.

## Technical notes

- Doctor schedules: new `provider_schedules` (weekday, start, end) and `provider_time_off` tables, clinic-scoped; slot generation folds them into the existing `src/lib/clinic-hours.ts` validation and conflict check so overrides keep working.
- Inventory: `inventory_items`, `inventory_batches`, `inventory_movements`; deduction hooks into treatment-record save where `units` is already captured.
- Audit: no schema change needed; write `activity_log` rows from the existing mutations in `src/lib/clinic-data.ts` and the server functions, ideally through one `logActivity` helper.
- Exports: a shared CSV helper reusing the pattern already in `GstFilingTab.tsx`.
- Every new table follows the project's existing CREATE → GRANT → RLS → POLICY order and clinic scoping.

Nothing here is a bug fix — the current behaviour works. Tell me which blocks you want and I'll turn them into an implementation plan.
