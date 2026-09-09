# Clinic owner's review: what's missing

Reviewed the live app end to end. The core is strong — patients, appointments, leads, GST billing, packages, WhatsApp, day close, consents, photos, team. Below are the real gaps a clinic owner will hit, ordered by how quickly they bite.

## A. Money control gaps (hits you in week one)

1. **Payment mode is not captured.** Recording a manual payment always saves it as "Cash". UPI, card, bank transfer and cheque all land in the cash column, so the day-close cash count can never tally.
2. **No refunds or advances.** There is no way to refund a patient, cancel a package with money back, or take an advance/token before a treatment. Today the only option is to void the invoice, which distorts the numbers.
3. **No expense side.** Rent, salaries, consumables, marketing spend — none of it is recorded, so "revenue" is the only number in the system and profitability is invisible.
4. **No patient ledger / statement.** A patient's charges, payments, package value and dues are spread across tabs; there's no single running account you can print and hand over.
5. **No GST filing export.** Invoices are GST-correct, but there's no GSTR-1 / B2C summary export for the CA — it's still a manual job each month.

## B. Operations gaps

6. **No inventory or consumables.** Botox/filler vials, needles, serums: no stock, no batch/expiry tracking, no auto-deduction when a treatment is recorded, no low-stock alert. For an aesthetic clinic this is the single biggest missing module — it's where the money leaks.
7. **No per-doctor availability.** Opening hours are clinic-wide only. There's no doctor roster, weekly availability, leave or blocked time, so the booking screen can offer a slot for a doctor who isn't in.
8. **No waitlist or slot suggestion.** When a slot is full there's no waitlist and no "next available" suggestion, so cancellations don't get backfilled.
9. **No staff attendance or shift log.** Incentives are computed from revenue but there's no attendance record to pair them with.
10. **No multi-branch.** One workspace = one clinic. A second location needs a separate account, and there's no combined owner view.

## C. Growth and retention gaps

11. **No recall / treatment-protocol scheduling.** Aesthetic treatments run in courses (laser every 4 weeks, botox every 4 months). The system doesn't automatically schedule the next session or flag patients due for a repeat.
12. **No memberships, loyalty or referral tracking.** Prepaid packages exist, but no monthly membership plans, no points, and no "who referred whom" credit.
13. **No marketing ROI.** Leads carry a source, but ad spend is never entered, so there's no cost-per-lead, cost-per-patient or revenue-per-source.
14. **No birthday / anniversary / dormant-patient campaigns.** Automation only fires around appointments and leads.
15. **No campaign or bulk messaging.** No way to message a filtered patient segment (e.g. everyone who did laser 6 months ago).

## D. Trust, compliance and safety

16. **No audit trail.** Who edited a price, voided an invoice, changed a clinical note or deleted a lead — none of it is logged. For a clinic with front-desk staff handling cash, this is a real risk.
17. **No data export / backup.** No "download all my patients and invoices" button.
18. **Clinical notes lock on sign-off, but there's no versioning** beyond a single addendum, and no photo consent flag separate from treatment consent.
19. **No prescription or aftercare-instruction output** — nothing printable to hand the patient post-procedure.

## E. Smaller usability issues noticed

20. Dashboard shows activity but not the three numbers an owner opens the app for: collection today, dues outstanding, month-to-date vs last month.
21. No global "today's cash position" or drawer view outside the Day close tab.
22. Patient duplicates are detected on phone, but there's no merge tool for duplicates already in the data.
23. No role-level restriction on sensitive screens — front-desk staff can reach revenue and incentive reports.

## Suggested order if you want me to build

1. **Payment modes + refunds/advances + expenses** — makes the money numbers true.
2. **Inventory & consumables with batch/expiry and auto-deduction** — biggest operational leak.
3. **Doctor availability, leave and waitlist** — stops mis-bookings.
4. **Recall/protocol scheduling + segment messaging** — repeat revenue.
5. **Audit log, role restrictions, data export, GSTR-1 export** — trust and compliance.
6. Multi-branch, memberships/referrals, marketing ROI.

Tell me which of these to start with and I'll write a build plan for it.
