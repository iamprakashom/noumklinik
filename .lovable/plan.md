# Fix: printing an invoice produces a broken/blank page

## The bug is real, and here's why

The invoice preview lives inside a modal dialog. That dialog is anchored to the middle of the screen, capped at 90% of the window height, and scrolls internally. The print stylesheet then tries to stretch the invoice to fill the paper by pinning it to the corners of its container — but its container is the clipped, centre-shifted modal, not the page. The result on the print sheet is an invoice that is pushed off-page and cut to a single screen's worth of content, so most sheets come out blank.

Confirmed by reading the print rules in the global stylesheet and the modal's positioning/height/scroll classes.

## The fix

- Rewrite the print rules so the invoice is detached from the modal for printing: the modal wrapper drops its fixed centring, height cap and internal scrolling; the invoice itself flows normally from the top of the page at full width instead of being pinned to its container's corners.
- Hide the dark modal backdrop, the page chrome and the toolbar row when printing.
- Set an A4 page size with sensible margins, keep table rows from splitting across pages, and force background/border colours to print so the header, table rules and totals stay visible.
- Keep the on-screen dialog experience unchanged.

## Technical notes

- `src/styles.css` `@media print` block: replace the `visibility: hidden` + `position: absolute; inset: 0` approach with a `body > * { display: none }`-style isolation plus explicit overrides on the invoice's dialog ancestors (`position: static; max-height: none; overflow: visible; transform: none; width: 100%`), reached via a print marker class on the dialog content.
- Add `@page { size: A4; margin: 12mm }`, `print-color-adjust: exact`, and `tr { break-inside: avoid }`.
- `src/components/clinic/InvoiceDocument.tsx`: add the print marker class to `DialogContent` so the stylesheet can target the exact ancestor chain; no logic changes.

## Verification

Open an invoice, trigger print, and check the generated preview shows the full header, line items, totals and footer on one A4 page.
