# Making the CRM usable for an Indian aesthetic clinic

Eight gaps, grouped into five shippable phases. Each phase is a working slice.

## Phase 1 — GST invoicing + INR/date locale

**GST invoice**
- Clinic profile gains: legal name, GSTIN, address, state + state code, invoice prefix and series.
- Services gain an SAC code (default 999722 for beauty/personal care; editable per service) and a GST rate (default 18%).
- Invoices store: GSTIN, place of supply (patient state, defaults to clinic state), taxable value, CGST, SGST, IGST, round-off, invoice series and a gapless sequential number issued by the database (not `Date.now()`).
- Split logic: same state as clinic → CGST 9% + SGST 9%; other state → IGST 18%. Per line item, since services can differ.
- Printable/PDF-ready A4 invoice view: clinic header with GSTIN, patient details, line table (description, SAC, qty, rate, taxable, CGST, SGST), totals, amount in words, place of supply, declaration and signature block.
- Cancellations use a credit note rather than deleting an invoice, so the number series stays intact.

**Locale**
- All date/time/number formatting switches to `en-IN` (`26 Aug 2026`, `7:30 pm`).
- The free-text "Tax rate %" field is removed from the invoice form; tax is derived from the service's GST rate.

## Phase 2 — Packages & prepaid balance

- Package catalogue in Settings: name, included services with session counts, price, validity (e.g. 6 months), whether unused sessions are refundable.
- Sell a package to a patient: creates a GST invoice (advance/service supply) and a patient package balance with sessions remaining and an expiry date.
- Redemption at the visit: when an appointment's service matches a live package, the invoice screen offers "Redeem 1 session" instead of charging; deducts one session, records the redemption, and books recognised revenue at the per-session rate.
- Patient profile shows active packages: sessions used/remaining, expiry, value consumed vs unused balance.
- Expiry handling: a package past validity stops redeeming and is flagged; optional manual extension with a reason.
- Liability report: total unused prepaid balance across all patients, ageing by expiry month — the number your CA asks for.

## Phase 3 — Money reporting, day-close and incentives

- Payments gain an explicit mode (Cash, UPI, Card, Bank transfer, Gateway link, Package redemption) and collected-by staff.
- **Day-close report**: date picker; collection split by mode, invoices raised, package sales, refunds, expected cash in drawer vs counted cash entered by front desk, variance and a close action that locks the day.
- **Outstanding dues**: invoices with balance > 0, patient, age of due, contact action.
- **Refunds and advances**: recorded against an invoice or a package with reason; visible in day-close and in the patient ledger.
- **Doctor/therapist incentive report**: revenue by provider and by service for a date range, split into service revenue and product revenue, with a configurable commission percentage per provider (and optional per-service override) producing a payable figure. Package redemptions credit the provider who performed the session.
- Dashboard gains: collection today by mode, dues total, month-to-date revenue vs last month.

## Phase 4 — WhatsApp for real (first-class setup)

- A guided WhatsApp setup step (not a toggle): pick a provider — AiSensy, Interakt or Gupshup — paste the API key and sender number, run a test send to the clinic's own number, and see a green "connected" state.
- Template registry: store approved template names, language, variable order and category, so a reminder rule binds to an approved template rather than free text. Warn when a rule has no approved template.
- Real dispatch: the reminder worker sends via the connected provider instead of only queueing; outbox rows record provider message id, delivery status and failure reason.
- Delivery webhooks update sent/delivered/read/failed, shown on the patient timeline.
- The 24-hour session-window rule is respected: outside it, only template messages are sent.

## Phase 5 — Patient-side flows, clinical depth, data-entry friction

**Phone-first patient identity**
- Mobile number normalised to a 10-digit Indian format and unique per patient; on lead conversion, booking and manual add, an existing number matches the existing patient instead of creating a duplicate.
- A merge tool for duplicates already in the data.

**Patient-side**
- Public booking link: pick service, date and slot; identifies the patient by mobile + OTP-less lookup, creates the appointment as "Requested" for front-desk confirmation.
- Tablet consent signing: open a consent template on a device, patient signs by drawing, stored with timestamp and staff witness.
- Post-visit feedback ask over WhatsApp: rating; 4–5 stars routes to the Google review link, 1–3 opens an internal complaint entry.

**Clinical chart**
- Allergy and medical-history flags surfaced as a red banner on the patient header and inside the appointment/treatment screen.
- Before/after photo compare: side-by-side and slider view, tagged by session and date, stored in a private bucket with signed URLs.
- Structured treatment record per session: device/product used, units, settings, areas treated, and provider sign-off that locks the note.

## Technical notes

- New tables: `clinic_profile`, `packages`, `package_items`, `patient_packages`, `package_redemptions`, `refunds`, `day_closes`, `provider_commissions`, `whatsapp_settings`, `whatsapp_templates`, `patient_feedback`, plus columns on `services` (SAC, GST rate), `invoices` (GST fields, series/sequence), `payments` (mode, collected_by), `patients` (normalised phone, state).
- Invoice numbering via a Postgres sequence + trigger inside a transaction, so numbers are gapless and race-safe.
- All new tables get explicit GRANTs, RLS enabled and staff-role policies matching the existing `has_role` pattern; the public booking endpoint is a narrow server route under `api/public/*` with rate limiting and no PII read-back.
- WhatsApp provider calls and delivery webhooks live in server functions / public routes; provider API keys stored as secrets, never returned to the client unmasked.
- Photos and signatures go to a private storage bucket accessed only through signed URLs.

## Suggested order

Phase 1 first (invoices are legally blocking), then Phase 2 (revenue model), Phase 3 (money control), Phase 4 (retention), Phase 5 (polish and patient-facing). Say the word if you want a different order or want a phase split further.
