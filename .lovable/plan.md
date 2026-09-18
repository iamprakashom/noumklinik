# Noum Klinik — operations and engineering review

Review of the live application against how an aesthetic clinic group actually runs a day. Findings are ordered by business impact. Nothing below has been changed yet.

## What is already strong

- Patient journey is complete end to end: lead, appointment, treatment note with photos, consent, invoice with GST, payment, recall.
- Billing maths has been corrected and is covered by tests; GST filing summaries and exports exist for the accountant.
- Packages have expiry, session gaps, liability tracking and automatic recalls.
- Appointment booking checks doctor and room clashes before confirming.
- Access is separated per clinic with roles, invitations, doctor linking and a workspace switcher.
- Multi-branch foundation is live: organisations, branches, branch switching and one shared patient identity per group.

## Findings

### 1. The multi-branch rollout is half done (highest risk today)

Branches exist and patients are shared, but the rest of the app still behaves as if there were one location. Treatments, services, prices, packages, doctors, invitations, settings, public booking and every report are still tied to a single branch. A group owner today cannot see the whole business in one place, and a shared patient's history is not labelled with the branch where each visit happened. This is the largest gap between what the data model promises and what staff see.

### 2. No consumables or stock control

There is no record of product used, batch numbers, expiry dates or remaining stock anywhere in the app. For an injectables and laser clinic this is both a money leak and a compliance problem: no per-treatment product cost, no way to trace a batch if a patient reacts, no alert before an expensive vial expires.

### 3. No expense side of the books

The app records income only. Rent, salaries, product purchases, marketing spend and refunds paid out are invisible, so the day-close and revenue reports show turnover, never profit. An owner still needs a spreadsheet to know how the month went.

### 4. Activity history only covers team changes

The activity trail records invitations, access changes, member removals and branch creation. It does not record discounts given, invoices voided, credit notes issued, clinical notes edited, patient records changed or package expiry extensions. These are exactly the actions an owner needs to review when money or a medical record is disputed.

### 5. No-show and cancellation policy is not enforced

No-shows can be marked and counted, but nothing follows: no deposit at booking, no cancellation window, no automatic fee, no repeat-offender flag, and no waitlist to fill the freed slot. For high-value laser and injectable slots this is direct lost revenue.

### 6. Reports cannot leave the screen

The revenue, day-close and staff reports have no download. Only the GST tab exports. Owners and accountants end up screenshotting or retyping figures.

### 7. Duplicate patients can only be avoided, not repaired

Duplicate phone numbers are detected at entry, but once two records exist — very common after Meta leads, walk-ins and online bookings — there is no merge. Splitting a patient's history across two records breaks packages, recalls and clinical continuity.

### 8. Clinical depth is thin for dermatology

Treatment notes are free text plus photos. There are no reusable treatment protocols (e.g. a six-session laser course with fixed intervals and settings), no prescriptions or aftercare sheets, no structured skin history (Fitzpatrick type, medications, prior treatments), and no explicit consent for using photos in marketing.

### 9. Payment mode is stored loosely

Cash, UPI, card and bank are recorded through a general reference field on the payment rather than a defined set of modes. It works today, but it makes reconciliation queries and future gateway matching fragile, and a typo silently creates a new "mode".

## Suggested order of work

1. Finish multi-branch: branch-labelled patient history, central catalogue with branch prices, branch-aware team and booking, consolidated owner reporting. (Already the open half of the rollout list.)
2. Money controls: expenses, refunds out, report downloads, and a full action history for discounts, voids and record edits.
3. Revenue protection: deposits, cancellation window, no-show fee, waitlist.
4. Stock: consumables with batch and expiry, product used per treatment, low-stock and expiry alerts.
5. Clinical depth: protocols, prescriptions and aftercare, structured skin history, photo-usage consent.
6. Housekeeping: patient merge, defined payment modes.

## Technical notes

- Branch work continues on the existing `organizations` / `organization_members` tables and the `current_organization_id()` and `current_clinic_id()` helpers; every new table stays clinic-scoped with row-level security and explicit grants.
- Stock and expenses are new clinic-scoped tables (`inventory_items`, `inventory_batches`, `inventory_movements`, `expenses`) with movements written from treatment records, not edited by hand.
- Action history reuses the existing `activity_log` table; writes belong in the server functions that already perform each action, not in the browser.
- Report downloads share one CSV helper with the GST tab.
- Payment mode becomes a constrained column with a backfill from today's reference values, keeping existing payments intact.

## Open question

Tell me which block to start with. My recommendation is to finish multi-branch first, since every later report and catalogue change would otherwise need reworking.
