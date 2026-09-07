# Rename the product to Noum Klinik

## Goal
Every place the app still calls itself "Luma", "Luma Aesthetics" or "Maeby CRM" should say **Noum Klinik**. Confirmed against the current code: 40 references across 18 files.

## What you'll see change

**Inside the app**
- The name at the top of the left menu changes from "Luma Aesthetics" to "Noum Klinik".
- Every browser tab title changes from "… — Luma Aesthetics Clinic CRM" to "… — Noum Klinik": Today, Appointments, Patients, Patient chart, Leads, Inbox, Billing, Reports, Follow-ups, Clinic setup.

**Pages patients and staff see**
- Sign-in page: the name beside the logo, the tab title and the sentence "Sign in to Luma to manage…".
- Welcome / landing page: the big heading and its tab title and description ("Luma is the all-in-one CRM…").
- Public booking page and the patient form link page: tab titles.
- Clinic setup page: tab title, plus the example text in the clinic-name box changes from "Luma Aesthetics, Indiranagar" to a neutral example.
- Join-a-clinic page: tab title and the sentence mentioning "Luma".

**Elsewhere**
- Emails the system sends currently show the sender name "Luma Aesthetics" when no custom sender is configured — this becomes "Noum Klinik".
- The project README title changes from "Maeby CRM" to "Noum Klinik".

## Important note
The clinic name your patients see on invoices comes from Settings → Clinic profile, which you control yourself. This rename only affects the software's own name, not your clinic's name.

## Out of scope
- No changes to features, data, invoices or your saved clinic details.
- The logo mark (stethoscope icon) stays as it is.
- The published web address stays the same unless you ask to change it.

## How it's verified
- Search the whole project for "Luma" and "Maeby" and confirm nothing remains outside the historical planning notes.
- Build the project to confirm nothing broke.
- Open the sign-in page, the welcome page and the dashboard in the preview and check the new name appears.

Note: browser tab titles and link previews on the live site only update after the next publish.
