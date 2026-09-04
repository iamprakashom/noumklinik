# Rebrand to Noum Klinik

## Goal
Replace the current product name "Luma Aesthetics" / "Maeby CRM" with "Noum Klinik" across the application, README, and outgoing email identity.

## What to change
- **README.md**: Change title from `# Maeby CRM` to `# Noum Klinik`; update opening description to use the new name.
- **App shell**: Update the sidebar brand text in `src/components/clinic/AppShell.tsx`.
- **Auth screen**: Update the brand text and page `<title>` / `og:title` in `src/routes/auth.tsx`.
- **Landing page**: Update the hero heading in `src/routes/index.tsx`.
- **Public booking page**: Update `<title>` / `og:title` in `src/routes/book.tsx`.
- **Patient form page**: Update `<title>` / `og:title` in `src/routes/p/$token.tsx`.
- **Onboarding**: Update `<title>` / `og:title` and the clinic-name placeholder in `src/routes/onboarding.tsx`.
- **Join clinic page**: Update `<title>` / `og:title` in `src/routes/join.tsx`.
- **Authenticated routes**: Update `<title>` / `og:title` in every `_authenticated` route to read "Noum Klinik" instead of "Luma Aesthetics Clinic CRM":
  - dashboard, appointments, patients/index, patients/$patientId, leads, inbox, billing, reports, automations, settings.
- **Email identity**: Update the fallback `from` name in `src/lib/messaging.server.ts` from "Luma Aesthetics" to "Noum Klinik".

## Out of scope
- No functional changes to features, routes, or database.
- No logo or icon changes; the stethoscope icon stays.
- No changes to the published Lovable URL slug.

## Verification
- Run a project-wide search for "Luma Aesthetics" and "Maeby CRM" and confirm zero remaining references (except historical plan documents).
- Run `bun run build` to confirm no broken imports or syntax errors.
- Spot-check the auth page, dashboard, and onboarding page in the preview.
