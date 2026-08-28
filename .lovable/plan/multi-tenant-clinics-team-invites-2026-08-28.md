# Multi-tenant clinics + team invites

Today every signed-up user lands in the same shared workspace. Verified: no table in the database has a clinic/owner column, and every access rule says "any user with a staff role can read and write everything". The sign-up trigger automatically grants `front_desk` to each new user, so a stranger who signs up sees your patients, invoices and leads.

Two things to build:

1. **Workspace isolation** — each clinic gets its own private workspace; data never crosses clinics.
2. **Team** — an owner can invite colleagues by email with a role, and manage/remove them.

## 1. Workspace isolation

- New `clinics` table (name, created_by). Every existing business table gains a `clinic_id`.
- New `clinic_members` table (clinic_id, user_id, role: admin / provider / front_desk, status). This replaces the global `user_roles` table as the source of truth for access.
- Access rules on all ~35 tables change from "is staff" to "is an active member of the clinic that owns this row", with the clinic id filled in automatically on insert.
- Sign-up flow: a new user with no membership and no invite is taken to a short "Create your clinic" screen (clinic name), which creates the clinic and makes them its admin. The auto-grant-role trigger is removed.
- Existing data: all current rows are attached to one clinic ("Luma Aesthetics") owned by the earliest existing user; current users who are already using the app stay as members of that clinic. Newly signed-up strangers do not.
- Public surfaces (`/book`, `/p/<token>`, webhooks) resolve the clinic from the token / connection record rather than the session, so patient links keep working.

## 2. Team management

- New **Team** tab in Settings: list of members (name, email, role, status), role dropdown, deactivate/remove, and pending invites with resend/revoke.
- **Invite colleague** dialog: email + role. Creates an invite row with a single-use token and expiry, and emails a join link.
- Accepting an invite: the invitee signs up or signs in from the link, and is added to the inviting clinic with the invited role — no "create clinic" step.
- Only clinic admins can invite, change roles, or remove members. The last remaining admin cannot be removed.

## Technical notes

- `clinic_id uuid not null references clinics(id)` on all business tables, backfilled to the legacy clinic, indexed.
- Membership check via a `security definer` helper `is_clinic_member(clinic_id, roles[])` to avoid recursive policy evaluation; policies use it for both read and write checks; grants re-issued per table.
- A `current_clinic_id()` helper supplies the column default so app code doesn't need to pass it, and invoice numbering (`assign_invoice_number`, `invoice_seq`) becomes per-clinic.
- `clinic_profile` loses its singleton constraint and becomes one row per clinic; likewise `whatsapp_settings`, `payment_gateway_settings`, `meta_connections`.
- Invite emails sent through the platform email sender; token hashed at rest, 7-day expiry.
- Server functions that use the admin (privileged) client must scope every query by the caller's clinic id.

## Sequencing

1. Schema + policies migration and backfill (biggest step; app keeps working unchanged).
2. Create-clinic onboarding screen and removal of the auto-role trigger.
3. Team tab, invites, accept-invite flow.
4. Pass over public routes, webhooks and server functions for clinic scoping.
