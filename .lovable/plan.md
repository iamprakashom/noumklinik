# Clinic CRM: Leads, Appointments, Payments, Reminders, Upsell

A single build covering five areas: richer Leads views, an Appointments rework, follow-up tracking, real payment collection via Razorpay/Cashfree, real reminder sending, and treatment add-ons with upsell discounts.

## 1. Leads

- Two views with a toggle; **table is default**, cards optional.
- Table columns: Name, Source, Treatment interest, Status (stage), Doctor, Created (ageing in days), Next follow-up.
- Filters: status, treatment, lead source, doctor. Sort by ageing (created date), newest/oldest.
- Lead sources normalised into groups: Meta Ads (Instagram / WhatsApp / Facebook), Google Ads, Organic, Referral, Walk-in.
- Interest strength tags (how keen the lead is — highly interested vs just exploring): Hot / Warm / Cold, editable inline and shown as coloured chips.
- Follow-ups: each lead can carry a next-follow-up date and owner. A "Follow-ups" section lists **Overdue** and **Scheduled** follow-ups, auto-built from lead data (no manual list to maintain).

## 2. Appointments (nav item renamed from "Schedule")

- Appointment gains: source (WhatsApp / Instagram / Facebook / Walk-in / Google / Referral), created date-time, scheduled date-time, treatment type, doctor (assigned or unassigned), notes, temperature tag.
- Filters: source, doctor, status, date range.
- Actions per appointment: create, reschedule (with reason + audit of previous time), assign/change doctor, add/modify treatment type, send reminder now.
- Unassigned-doctor appointments are visually flagged so front desk can triage.

## 3. Treatments, add-ons and upsell

- Services get an add-on relationship: a main treatment (e.g. Laser Hair Removal) can offer add-ons (Hydra Facial, Pigmentation).
- When booking or invoicing a main treatment, suggested add-ons appear with a one-click add.
- Add-on discount rules: configurable discount (percent or flat) that applies when N add-ons are attached to a main treatment; the invoice shows the upsell discount as its own line.

## 4. Payments (Razorpay + Cashfree)

- Settings screen where the clinic connects its own merchant account per provider (key id + secret, mode test/live). Secrets are stored server-side, never exposed to the browser.
- From an invoice: "Collect payment" creates a real payment link/order with the connected provider, supporting **UPI** and **EMI** methods, and shares the link (copy / send to patient).
- Provider webhooks mark the invoice paid and record the payment automatically; payment status is visible on the invoice.
- Manual cash/card recording stays available.

## 5. Reminders (real sending)

- Reminder rules keep the current outbox model, plus a real sender that delivers queued messages over WhatsApp, SMS, and email.
- Session reminders: automatic pre-appointment reminders per rule, plus a manual "send reminder" action.
- Delivery status per message (queued, sent, failed with reason) shown in the outbox.

## Technical notes

- Schema changes (migration): `leads` gains `temperature`, `next_follow_up_at`, `treatment_id`, source-group normalisation; `appointments` gains `source`, `temperature`, `reschedule_count`/`previous_starts_at`; new `service_addons` (main service to add-on) and `addon_discount_rules`; new `payment_provider_settings` (per-clinic provider config) and `payment_links`; `messages_outbox` gains provider message id + failure reason. All new public tables get GRANTs and staff-role RLS matching existing tables.
- Payment provider secrets and messaging credentials are read only inside server functions / server routes. Order creation lives in `createServerFn`; provider callbacks live in signature-verified routes under `src/routes/api/public/hooks/razorpay.tsx` and `.../cashfree.tsx`.
- Reminder delivery runs from the existing reminder runner route, calling the messaging provider and updating outbox rows.
- UI work extends the existing clinic components (table/filter primitives in `src/components/clinic/bits.tsx`), keeping the current clinical teal design system.

## Credentials I'll need from you

- Razorpay: key id + key secret (test or live), and webhook secret.
- Cashfree: app id + secret key, and webhook secret.
- Messaging: WhatsApp Cloud API token + phone number id (or Twilio SID/token) and an email sending key.

I'll request these through the secure secret prompt when I reach those steps; the app builds and runs without them, with sending and payment links disabled until they're added.
