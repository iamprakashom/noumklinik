# Packages in Settings — review and enhancements

## How it works today

- Settings > Packages lists each package with its included sessions, validity, refundable flag and price.
- New/Edit dialog captures name, description, service lines with session counts, price, validity days, refundable switch.
- Selling happens from a patient's page ("Sell package"): raises one GST invoice and opens the patient's session balance.
- Redemption is a manual "Redeem 1 session" button on the patient's package card; expired packages can be extended by 90 days with a reason.

## What a dermatology clinic is missing

**1. No way to retire a package**
The only option is Delete, which is permanent and sits on top of packages that patients may already have bought. The catalogue stores an active/inactive flag and the selling screen already respects it, but nothing in Settings can set it. Fix: replace Delete with Archive/Restore (same pattern already used for Services), keep archived rows visible but muted, and delete only when the package was never sold.

**2. No pricing intelligence at the point of creation**
The manager types a price with no view of what the included sessions are worth at list rate, so discounts are guesswork. Fix: show live "List value / Package price / Saving (amount and %)" in the dialog, and a per-package saving badge in the list. Warn when the price exceeds list value or when the discount crosses a set threshold (e.g. over 40%).

**3. Archived treatments can still be added to a package**
The service dropdown in the dialog is unfiltered, so a retired treatment can be put into a new package and then never booked. Fix: only offer active services; if an existing package holds an archived service, flag that row so the manager knows to fix it.

**4. No session spacing guidance — the biggest clinical gap**
Laser, peels, microneedling and PRP all have protocol intervals (typically 3–6 weeks). Today a 6-session laser package carries no interval, so front desk books sessions at random gaps and outcomes suffer. Fix: add an optional "gap between sessions (days)" per service line; when a session is redeemed, use it to propose the next session date and create the follow-up recall automatically (recalls already exist in the app).

**5. No visibility on how a package is performing**
Settings shows the catalogue but never how many were sold, how many sessions are pending, or the unredeemed liability sitting on the clinic's books — the number an owner actually needs at month end. Fix: add per-package counters (sold, active, sessions redeemed vs pending, outstanding liability) and a summary strip on the tab.

**6. Redemption doesn't record who performed the session**
The redemption record has fields for the doctor and appointment, but the button sends neither, so package work never shows in doctor-wise reports or incentives. Fix: ask for the doctor (and the linked appointment when available) at redemption.

**7. Expiry handling is blunt**
Extension is a fixed 90 days via a browser prompt, and there is no warning before a package lapses. Fix: proper dialog with a chosen date and reason, plus an "expiring in 30 days" indicator on the patient card and a package expiry recall.

## Suggested order

1. Archive/Restore + active services only + pricing summary (catalogue hygiene, no schema change).
2. Per-package performance counters and liability.
3. Session-gap field with automatic next-session recall (needs one new column on package lines).
4. Doctor capture on redemption, expiry dialog and expiry warnings.

## Technical notes

- `packages.active` already exists; `SellPackageDialog` filters on it — only the Settings UI needs the control. Hard delete stays available only when no `patient_packages` row references the package.
- Pricing summary derives from `services.price` × sessions in the dialog's existing `drafts` state; no schema change.
- Counters come from `patient_packages`, `patient_package_items` and `package_redemptions`, aggregated by `package_id`; reuse `unusedValue` for liability.
- Session spacing needs `package_items.gap_days integer null` (migration, with grants unchanged as the table already has them); redemption then inserts a `patient_recalls` row due at redeemed_at + gap_days.
- `useRedeemSession` already accepts `appointment_id` / `provider_id` — only the UI has to pass them.
- Extend `PackagesTab.test.ts` with cases for archive, list-value calculation and active-service filtering.
