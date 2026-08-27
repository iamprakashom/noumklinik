# Google review asks + remaining data-entry friction

Two slices from the backlog. Multi-branch and the polish list are deferred.

## 1. Google review asks

- Clinic profile gains a Google review link field.
- Post-visit feedback message (WhatsApp/SMS) asks the patient for a 1–5 rating, sent as a follow-up rule after a completed appointment.
- Rating 4–5 → the reply carries the Google review link. Rating 1–3 → creates an internal complaint entry on the patient record and flags it for the front desk, so unhappy feedback never lands on Google first.
- A small feedback panel on Reports: average rating, review-link clicks, and open complaints with a resolve action.

## 2. Remaining data-entry friction

- Global command palette (Cmd/Ctrl+K): jump to a patient, book an appointment, or add a lead without touching the mouse.
- Quick-add patient inline from the booking dialog — name + phone only, rest of the details filled in later.

## Technical notes

- Migration: `google_review_link` on `clinic_profile`; new `patient_feedback` table (patient, appointment, rating, comment, complaint flag, resolved_at) with GRANTs, RLS and staff-role policies matching the existing `has_role` pattern.
- Rating capture happens on the existing public patient-link route (`/p/<token>`) with a new `feedback` link kind, minted by the reminder runner for a post-visit rule — no new public endpoint.
- Command palette is a client-only component mounted in the app shell, backed by the existing patients/services/leads queries.
- Quick-add patient reuses the existing patient insert path plus the duplicate phone/email warning already in place.
