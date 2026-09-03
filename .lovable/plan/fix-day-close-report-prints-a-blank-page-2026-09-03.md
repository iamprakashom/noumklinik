# Fix: Day close report prints a blank page

## Root cause (confirmed)

The invoice print fix left a global rule in the app stylesheet that hides every top-level
element on the page unless that element contains the invoice document:

```text
body > *:not(:has(.invoice-print-shell)):not(.invoice-print-shell) { display: none }
```

The Reports page has no invoice document anywhere on it, so when "Print day close" calls
the browser print dialog, that rule matches the entire app root and hides it. Nothing is
left to print, which is exactly the white/empty sheet being seen.

Verified: the rule exists in `src/styles.css` (`@media print`), and
`src/routes/_authenticated/reports.tsx` renders the Day close tab with no such marker —
its only print-related code is the `window.print()` button.

## The fix

Make the print stylesheet generic instead of invoice-only:

- Introduce a shared print marker (e.g. `.print-scope`) used by any printable area.
  The invoice keeps working through the same mechanism; the Day close panel opts in too.
- Change the isolation rule to key off that shared marker, so a page with any printable
  region prints that region, and pages with none print normally rather than blank.
- Wrap the Day close content (business date header, the four summary cards, collection by
  payment mode, payments logged) in the print scope, and hide the date input, tab bar and
  the Print button on paper.
- Add a small printed header line — clinic name and business date — so the sheet is a
  usable day-close record, and keep list rows from splitting across pages.
- On-screen layout is unchanged.

## Technical notes

- `src/styles.css` `@media print`: replace the `.invoice-print-shell`-specific `body > *`
  rule with a `.print-scope`-based one; keep the existing dialog-detach overrides scoped to
  `.invoice-print-shell` (they are only needed inside the modal).
- `src/components/clinic/InvoiceDocument.tsx`: add `print-scope` alongside the existing
  `invoice-print-shell` class so invoice printing keeps its current behaviour.
- `src/routes/_authenticated/reports.tsx`: add a `print-scope` wrapper around the Day close
  tab content, a print-only heading, and `print:hidden` on the controls.

## Verification

Open Reports → Day close, print to PDF, and confirm the sheet shows the date heading,
the four totals, the payment-mode breakdown and the payments list. Re-print an invoice to
confirm no regression.
