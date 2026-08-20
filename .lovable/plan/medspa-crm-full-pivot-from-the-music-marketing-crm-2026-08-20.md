# MedSpa CRM — full pivot from the music-marketing CRM

Rebuild the app as an aesthetics clinic management platform: patients, appointments, clinical charts and consents, invoices, lead capture, and automated follow-ups over Email/SMS/WhatsApp. The current campaigns/team/Trend AI product is removed.

## Visual direction

Refresh to a calm clinical system: soft teal-sage primary, warm neutral surfaces, 12px card radius, generous spacing, hairline dividers. Same dense Linear-like information rhythm, new palette and tone. All colors as semantic tokens in the global stylesheet.

## Modules

**Patients** — searchable list plus a patient profile with tabs: Overview (contact, tags, allergies, alerts), Treatment history, Charts, Consents, Photos, Invoices, Communications timeline.

**Appointments** — day/week calendar by provider and room, plus a list view. Booking dialog: patient, service, provider, room, start/duration, notes. Statuses: booked, confirmed, checked-in, completed, no-show, cancelled. Drag-free editing via a side panel.

**Clinical** — per-appointment treatment record: service performed, injectables/units or device settings, SOAP-style notes, before/after photo slots, provider sign-off (locks the note). Consent forms: templates, per-patient signed consent with typed signature and timestamp.

**Leads** — pipeline board (New → Contacted → Consult booked → Converted → Lost) with source, owner, notes, and one-click convert to patient. Meta/Facebook Lead Ads capture via a public webhook endpoint that verifies the Meta signature and inserts leads. Manual and web-form leads land in the same table.

**Reminders & follow-ups** — rule-based automation: appointment reminders (24h / 2h before), post-treatment follow-up (e.g. day 3, day 14), recall for repeat treatments, no-show win-back, lead nurture. Each rule targets a channel (Email, SMS, WhatsApp) with a message template supporting merge fields. A scheduled job materializes due messages into an outbox and dispatches them; every send is logged on the patient timeline with delivery status.

**Billing** — invoice per visit with line items (services, products), discounts, tax, totals; payment records with method and status; patient balance. No live payment gateway in this phase.

**Dashboard** — today's schedule, check-ins pending, revenue today/this month, new leads, conversion rate, upcoming follow-ups, no-show rate.

**Settings** — clinic profile, services catalog with price/duration, rooms, providers/staff and roles, consent templates, message templates, automation rules.

## Delivery phases

1. Design system refresh, new navigation shell, database schema, patients module.
2. Services/providers/rooms settings, appointments calendar, check-in flow.
3. Clinical charts, consents, photos, provider sign-off.
4. Invoices and payments.
5. Leads pipeline + Meta Lead Ads webhook.
6. Reminder rules, templates, outbox, scheduled dispatch, communications timeline.

## Technical notes

- New tables: `patients`, `providers`, `rooms`, `services`, `appointments`, `treatment_records`, `consent_templates`, `patient_consents`, `patient_photos`, `invoices`, `invoice_items`, `payments`, `leads`, `message_templates`, `automation_rules`, `messages_outbox`, `staff_roles`. Old `campaigns` / `deliverables` / `people` tables are dropped in the same migration set.
- Every table gets explicit GRANTs, RLS enabled, and staff-scoped policies. Clinical notes, photos, and consents are restricted to authenticated staff; roles (`admin`, `provider`, `front_desk`) live in a separate role table checked by a security-definer function.
- Photos and signed consent PDFs go to a private storage bucket with signed-URL access only.
- All data access through `createServerFn` + TanStack Query; the app stays under the existing authenticated route gate.
- Meta lead webhook and the reminder cron trigger live under `src/routes/api/public/*` with signature/secret verification.
- Outbound channels need provider credentials, requested when we reach phase 6: email sender domain, an SMS provider key, and a WhatsApp Business API token. Meta Lead Ads needs a Page access token and app secret. Until those exist, messages queue in the outbox and are visible in the UI without dispatch.
- Routes removed: campaigns, trends, people. Landing and auth pages are re-themed for the clinic.

## Scope note

This is a large build. Each phase ships as a working slice; I'll start with phase 1 unless you want a different order.
