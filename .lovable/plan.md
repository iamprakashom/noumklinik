# Multi-user review — Noum Klinik

## What works today

- Each clinic is a separate workspace; every table is scoped to a clinic and the database refuses cross-clinic reads.
- Invites are single-use, hashed, expiring, and only accepted by the exact email they were sent to.
- Suspending or removing someone instantly cuts their access, and the last admin cannot be demoted or suspended.
- Payment settings, lead capture and messaging setup are already admin-only.

## Gaps a clinic owner would feel

1. **Roles are named but not enforced.** Admin, Doctor and Front desk exist, yet a front-desk user can open Reports (full revenue, doctor-wise earnings, GST export), read every patient's clinical notes and photos, edit invoices, and change prices. For a dermatology practice this is both a commercial and a medico-legal exposure.
2. **A doctor login is not connected to a doctor record.** Logins and the doctor list are two unrelated things, so there is no "my day", no "my patients", and doctor-wise revenue cannot be tied to the person who is signed in.
3. **Invites are copy-paste only.** The admin gets a link and must send it over WhatsApp themselves. No email, no resend, no reminder, no view of who has not joined.
4. **No activity trail.** Nobody can answer "who cancelled this appointment", "who deleted this invoice", "who changed the price", or "who opened this patient's photos". Clinics need this for staff disputes and for consent/record integrity.
5. **Only one clinic per login in practice.** A user in two clinics silently lands in the oldest one; no way to switch. Blocks second branches and visiting consultants.
6. **No roster hygiene.** Admins cannot see who has actually signed in, last activity, or which invites are stale.

## Proposed work

### Phase 1 — Make roles mean something (highest value)

- Define a permission map per role:
  - **Admin/Owner:** everything.
  - **Doctor:** patients, appointments, clinical notes, photos, packages redemption, own performance figures. No clinic revenue, no GST filing, no pricing or settings.
  - **Front desk:** patients (demographics/contact), appointments, leads, billing and payment collection. No clinical notes or photos, no reports, no settings.
- Enforce in three places, not one: hide menu and buttons, block the route, and tighten the database policies for clinical notes, photos, reports-feeding reads and settings tables so the rule holds even outside the app.
- Add a clear "you don't have access to this" screen instead of a blank page.

### Phase 2 — Tie logins to doctors

- Add an optional link from a team member to a doctor record; set it while inviting ("this person is Dr. X").
- Use it for a "My day" view, default doctor filters, and doctor-wise figures that a doctor can see for themselves only.

### Phase 3 — Invite and roster experience

- Send the invite by email from the app, with resend and copy-link fallback.
- Roster shows joined / invited / suspended, invite age, and last sign-in.
- Optional: restrict a member to specific weekday hours is out of scope; flagged only if you want it later.

### Phase 4 — Activity trail

- One append-only activity table capturing who, what, which record, and when for: appointment cancel/reschedule, invoice create/void/credit note, payment record and refund, price and package changes, clinical note edit/addendum, patient photo view/download, team role changes.
- Admin-only "Activity" screen with filters by person and date, plus CSV export.

### Phase 5 — Multiple clinics per login

- Clinic switcher in the header; the chosen clinic drives everything for that session.
- Invites can add an existing user to a second clinic without disturbing the first.

## Technical notes

- Permissions: a single `src/lib/permissions.ts` map consumed by the shell menu, a route guard in the `_authenticated` layout, and mirrored as database policies using the existing `has_role` helper.
- Database: new policies split `Clinic members access` into read/write variants for `treatment_records`, `patient_photos`, `invoices`, `payments`, `services`, `packages`; every new table keeps the GRANT + RLS order already used in this project.
- Doctor link: nullable `provider_id` on `clinic_members`, unique per clinic.
- Activity trail: `activity_log` table, clinic-scoped, insert via server functions only, admin-read policy; written from existing mutation paths in `src/lib/clinic-data.ts` and the server functions.
- Clinic switching: replace the "oldest membership" rule in `current_clinic_id()` with a stored active-clinic claim or per-request clinic id, which touches every policy — do this as its own phase, not bundled.
- Invite email uses the project's existing email sending; no new provider.

## Suggested order

Phase 1 alone removes the biggest risk. Phases 2 and 3 are quick follow-ons. Phase 4 matters before the clinic hires beyond a handful of people. Phase 5 only when a second branch is real.
