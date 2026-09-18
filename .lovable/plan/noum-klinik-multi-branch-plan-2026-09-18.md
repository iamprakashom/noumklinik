# Noum Klinik multi-branch plan

## Current status

Noum Klinik has a strong starting point, but it currently supports **multiple independent clinic workspaces**, not branches under one clinic group.

Already working:
- Every operational record is isolated by clinic, including patients, appointments, clinical notes, invoices, payments, packages, leads, messaging, and settings.
- A user can belong to multiple clinics with a different role in each.
- The header clinic switcher changes the active clinic, clears cached data, and reloads the correct workspace.
- Invitations, doctor linking, role-based menus, and database access rules are clinic-specific.
- GST profile, invoice numbering, payment settings, WhatsApp, Meta connections, providers, rooms, services, and packages are currently configured separately for each clinic.

Missing for a real branch network:
- No parent organization connects branches.
- No organization owner or central operations role exists.
- Patients, doctors, services, and packages cannot currently be shared across branches.
- There is no consolidated branch report or comparison view.
- Staff and invitations must be managed one clinic at a time.
- Public booking links open one clinic directly; patients cannot choose a location.
- Doctor conflicts are checked only inside one clinic, so a doctor could be double-booked across branches.

## Agreed operating model

- **Patients:** one shared patient profile and clinical history across the organization; each appointment, treatment, payment, package use, and invoice retains the branch where it occurred.
- **Services and packages:** head office maintains the master catalog; branches can override availability, price, duration, tax treatment, and package availability.
- **Access:** organization owners see and manage all branches; other staff only access assigned branches with a role per branch.
- **Billing:** preserve branch-specific invoice identity and numbering by default. Organization-wide reporting consolidates figures without changing historical invoices. The data model will support a shared legal entity while allowing branch-specific GST details where required.

## Phase 1 — Organization and branch foundation

1. Add an organization above the existing clinic records; existing clinics become branches without renaming or breaking their current records.
2. Backfill every existing clinic into its own organization so current users see no behavior change.
3. Add organization membership for owner and central operations access.
4. Keep branch assignments for admin, doctor, and front-desk roles.
5. Add an active-organization preference alongside the existing active-clinic preference.
6. Replace the current clinic selector with a branch selector showing organization and branch names.
7. Add a Branches section for owners to create, edit, archive, and switch branches.

## Phase 2 — Shared patients and cross-branch history

1. Promote patients to organization scope with an optional home branch.
2. Prevent duplicate patients across branches using normalized phone and email checks within the organization.
3. Keep appointments, treatment records, photos, consents, invoices, payments, recalls, packages, and redemptions tagged with the servicing branch.
4. Show a unified patient timeline with clear branch labels on every visit and financial record.
5. Allow authorized doctors and organization owners to see the complete clinical history; front desk sees only the demographic and operational information allowed by its role.
6. Add branch-aware patient search and a safe merge path for duplicates created before rollout.

## Phase 3 — Central treatments, packages, and doctors

1. Create organization-level master treatments and packages.
2. Add branch overrides for availability, price, duration, GST/SAC details, and local package price.
3. Make rooms branch-specific because they are physical resources.
4. Make doctor identity organization-wide, then assign each doctor to one or more branches.
5. Keep each doctor’s branch role and availability separate.
6. Check appointment conflicts across every assigned branch to prevent double-booking.
7. Provide a branch setup action that copies central defaults without creating disconnected duplicates.

## Phase 4 — Central team administration

1. Add an organization Team view with each person’s branch assignments, roles, doctor link, status, and last activity.
2. Invite once, then choose one or several branches and a role for each.
3. Add organization roles for Owner and Central Operations; keep Admin, Provider, and Front Desk as branch roles.
4. Allow owners to add or remove branch access without recreating a user.
5. Apply access checks in navigation, pages, server functions, and database policies.
6. Record branch creation, assignment changes, role changes, and cross-branch access in the activity trail.

## Phase 5 — Branch-aware settings and integrations

1. Split settings into **Organization defaults** and **Branch overrides**.
2. Keep branch address, hours, rooms, contact details, and local invoice identity at branch level.
3. Allow consent templates, message templates, automations, treatment catalog, and package catalog to inherit organization defaults.
4. Allow payment, WhatsApp, Facebook, and Instagram connections to be organization-wide or branch-specific without exposing credentials to branch staff.
5. Add a public booking flow that first selects a branch, then shows only that branch’s available doctors, rooms, services, and times.

## Phase 6 — Consolidated owner reporting

1. Add All branches / single branch controls to owner reports.
2. Provide branch comparison for collections, invoiced value, outstanding balance, appointments, cancellations, no-shows, new patients, package liability, leads, and conversion.
3. Keep GST exports grouped by the invoice-issuing branch and GST registration; do not combine incompatible GST registrations.
4. Add doctor performance across branches without double-counting shared patients or package revenue.
5. Add CSV exports with organization, branch, and legal-entity columns.
6. Preserve branch-level day close; add an organization summary above it rather than mixing tills.

## Technical approach

- Add `organizations`, `organization_members`, and branch-assignment tables with explicit grants and row-level policies.
- Add `organization_id` to the existing `clinics` table; keep `clinics.id` as the branch key already referenced by operational tables.
- Introduce new organization/branch access helpers alongside the existing clinic helpers, then migrate policies table by table instead of replacing the current security boundary at once.
- Add organization identity to patients and doctors while retaining branch IDs on branch events and financial documents.
- Use dedicated branch-override tables for treatments and packages rather than copying master rows.
- Preserve all historical invoice numbers, sequences, GST snapshots, payments, and clinical records unchanged.
- Scope query-cache keys by organization and branch so switching cannot show stale data from another location.
- Add security tests proving branch staff cannot read another branch, while organization owners can access authorized consolidated views.

## Rollout and verification

1. Ship the organization layer in a backward-compatible one-organization/one-branch state.
2. Verify current clinic switching, roles, invites, billing, reports, booking, and messaging remain unchanged.
3. Enable branch creation only after organization access rules pass isolation tests.
4. Migrate shared patients first, with duplicate detection and record-count reconciliation.
5. Enable shared catalog and doctor assignments next.
6. Enable consolidated reports last, after branch totals reconcile exactly with existing reports.
7. Validate desktop and mobile branch switching, invite acceptance, patient history, booking, billing, GST export, and access-denied states.

## Recommended delivery order

Start with Phases 1 and 2 as the first release. They establish safe branch ownership and the shared patient record—the main operational reason clinics need multi-branch software. Add central catalog/doctors and team administration next, then integrations and consolidated reporting after branch-level figures reconcile.
