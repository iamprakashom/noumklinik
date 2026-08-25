# Smarter field mapping with confidence scoring

Today every Facebook lead-form question gets a single best guess with no indication of how sure the match is, and anything unrecognised silently falls into Notes. This adds scored suggestions so clinics only stop to confirm the questions that genuinely need a human.

## How it will feel

- Each form shows a one-line summary: "6 of 7 fields matched confidently — 1 needs your confirmation".
- Questions matched with high confidence are collapsed behind "Show all fields"; only low-confidence ones are shown up front, marked "Needs confirmation".
- Every dropdown carries a small confidence label: Certain / Likely / Unsure, plus the reason in a tooltip (e.g. matched on "phone").
- An "Auto-apply best guesses" switch (on by default for new forms). When on and everything scores above the confidence bar, the form saves its mapping automatically and just shows "Mapped automatically — review anytime".
- When at least one question is unsure, the card surfaces an amber "Confirm 1 field" prompt instead of auto-saving, so capture never starts on a bad guess.
- Manual edits are remembered: once a user picks a target for a question, later refreshes never overwrite it.

## Scoring rules

Each question is scored 0-1 against each CRM field (Full name, Phone, Email, Interest/treatment, City, Notes, Ignore):

- 1.0 — Meta's own standardised question key (`full_name`, `email`, `phone_number`, `city`).
- 0.9 — exact label match against a known synonym list.
- 0.7 — strong keyword hit inside the label ("mobile number", "which treatment").
- 0.5 — weak/partial hit or a multiple-choice question whose options look like treatments (matched against the clinic's own service names).
- 0.2 — fallback to Notes.

Thresholds: >= 0.7 auto-applied, 0.4-0.69 shown as "Likely" and pre-selected but flagged, < 0.4 shown as "Unsure" and requires confirmation. A field already claimed by a higher-scoring question can't be claimed twice (no two questions map to Phone).

## Technical notes

- `src/lib/meta-leads.server.ts`: replace `autoMap` with `suggestMap(questions, serviceNames)` returning `{ key, target, confidence, reason }[]`, plus a thin `autoMap` wrapper for existing callers. `saveForms` stores both `field_map` and a new `field_confidence` JSON column, and sets `needs_review` when any question falls below the bar; on refresh it re-scores only questions the user never touched (tracked via a `confirmed_keys` array).
- Migration on `meta_lead_forms`: add `field_confidence jsonb default '{}'`, `confirmed_keys text[] default '{}'`, `needs_review boolean default false`, `auto_apply boolean default true`. Existing rows get their current map re-scored on next refresh.
- `saveFormSettings` server fn accepts the extra flags and records which keys the user explicitly set.
- `src/components/clinic/LeadCaptureTab.tsx`: `FormCard` gains the summary line, confidence chips, collapsed high-confidence section, the auto-apply switch, and the "Confirm N fields" state. Service names for treatment matching come from the existing services query.
- Ingestion (`buildLeadRow`) is unchanged; it keeps reading `field_map`.
