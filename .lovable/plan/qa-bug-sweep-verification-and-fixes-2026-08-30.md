# QA bug sweep — verification and fixes

I checked each reported item against the code and the live database. Here's what is real, what the actual cause is, and what I'd change.

## Confirmed real

**1. Sign-in lands on `/#` instead of the dashboard**
Google sign-in sends the user back to the site root, and the landing page has no session awareness — so a signed-in user sits on the marketing page with a leftover `#` in the URL. It also shows an "Open clinic" button next to "Sign in" regardless of session.
Fix: make the landing page redirect a signed-in user straight to the app (dashboard, or clinic setup when they have no clinic yet), and point Google sign-in at a callback that does the same. The header/CTA reflects the session instead of always saying "Sign in".

**2. Row-level-security errors on every create (leads, services, providers, rooms, consent templates, automation rules, message templates, add-on discounts) until a clinic was created**
Real, and the cause is exactly what QA guessed: rows are stamped with the signed-in user's clinic automatically, and a user with no clinic gets no clinic — so every insert is rejected. Today the clinic-setup screen is only reached by opening a protected page; the landing page's "Open clinic" link and the post-sign-in flow let a brand-new user reach app screens before setup in some paths.
Fix: setup becomes unavoidable — immediately after first sign-in the user is taken to "Create your clinic", and the app shell refuses to render (redirects to setup) whenever there's no active clinic. Plus a plain-English fallback message instead of the raw database error if an insert is ever attempted without a workspace. All current accounts already have a clinic, verified in the database.

**3. Clinic profile "Save clinic profile" does nothing**
Real. The save handler bails out silently when no clinic-profile record exists yet, which is the case for any clinic whose profile row wasn't created. Nothing is written and no message is shown.
Fix: save creates the record when it's missing (upsert) and always shows a success or error toast.

**4. Invoice creation — "duplicate key value violates unique constraint invoices_number_unique"**
Real, two separate causes:
- The uniqueness rule on invoice numbers is global across all clinics, so two clinics using the same prefix and year collide. It must be unique *per clinic*.
- The next sequence number is computed with "highest so far + 1" without locking, so two invoices raised at nearly the same moment get the same number.
Fix: change the constraint to per-clinic, and allocate the number from a per-clinic counter that's safe under concurrency, with a retry.

**5. New appointment → "Treatment type" dropdown appears broken**
Real but not a wiring bug: the dropdown is populated from the clinic's service catalogue, which is empty for a new clinic, so it renders with nothing to pick and no explanation. It also has no "select…" placeholder, so the first service is silently pre-selected.
Fix: add an explicit placeholder, and when the catalogue is empty show "No treatments yet — add them in Settings → Services" with a link.

**6. Clicking "New" quickly on Services creates two entries / two dialogs**
Real as a double-submit: the create button isn't disabled while the request is in flight, so a fast double click saves two records.
Fix: disable the submit button while saving across all four Settings dialogs (service, provider, room, consent form), and close the dialog only after success.

## Technical notes

- Landing (`src/routes/index.tsx`): session check, redirect to `/dashboard` or `/onboarding`; remove the unconditional "Open clinic" link. `src/routes/auth.tsx` Google flow redirects through a callback route that applies the same rule.
- Onboarding gate: `_authenticated/route.tsx` already redirects to `/onboarding` when no active membership; tighten so the post-sign-in navigation goes to setup directly rather than bouncing through the dashboard.
- Database migration: drop `invoices_number_unique`, add unique `(clinic_id, number)`; rewrite `assign_invoice_number` to take a row lock on the clinic's counter (advisory lock or `select … for update` on a per-clinic sequence row) instead of `max(seq)+1`.
- `ClinicProfileTab.tsx`: replace the `if (!id) return` early exit with an insert-or-update path keyed on `clinic_id`.
- `appointments.tsx`: placeholder option + empty-state hint on the service select.
- `settings.tsx`: pending state on the shared dialog footer button.

## Sequencing

1. Invoice numbering migration (database).
2. Auth/onboarding redirect chain.
3. Clinic profile save, treatment dropdown, double-submit guards.
