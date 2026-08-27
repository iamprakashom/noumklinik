# Remaining backlog — closing out the clinic CRM

Everything from the earlier review is done except three areas, plus a small polish list.

## 1. Multi-branch support (review item 3)

- `branches` table (name, address, GSTIN/state per branch, invoice series per branch).
- Appointments, invoices, packages, leads, day-close all gain a branch column; staff get a branch assignment with a branch switcher in the shell.
- Reports and day-close filter by branch; GST place-of-supply uses the branch's state, invoice numbering uses the branch's series.
- Single-branch clinics see no UI change (branch hidden when only one exists).

## 2. Google review asks (review item 8)

- Clinic profile gains a Google review link.
- Post-visit feedback message (WhatsApp/SMS) asks for a 1–5 rating.
- Rating 4–5 → reply carries the Google review link. Rating 1–3 → creates an internal complaint entry on the patient record and alerts the front desk, so bad feedback never reaches Google first.

## 3. Remaining data-entry friction (review item 10 leftovers)

- Duplicate-phone merge tool: lists patients sharing a normalised phone, pick a survivor, re-points appointments/invoices/packages and archives the duplicate.
- Global keyboard shortcut (Cmd/Ctrl+K) command palette: jump to patient, book appointment, add lead without touching the mouse.
- Quick-add patient inline from the booking dialog (name + phone only, details later).

## 4. Small polish while we're in there

- Patient header allergy/medical-alert red banner everywhere the patient appears (booking dialog, appointment row tooltip).
- Outbox "retry failed" bulk action.
- Reports: export to CSV for the CA (day-close, dues, incentives).

## Technical notes

- Migration: `branches` + branch columns and backfill to a default branch, `google_review_link` on clinic profile, `patient_feedback` table (rating, complaint flag, resolved), merge helper as a security-definer function that re-points FK rows transactionally.
- All new tables: GRANTs, RLS, staff-role policies matching the existing `has_role` pattern.
- Command palette is a client component (no backend); merge tool runs as a server function with admin role check.

## Suggested order

1 → 2 → 3 → 4 as one build, or I can ship 2+3 first (smaller, immediately useful) and do branches separately — say which.
