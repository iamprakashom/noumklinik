# Invoice status filter and matching summaries

## What will change

- Add a status filter in the Invoice table's Status column with: All statuses, Open, Part-paid, Paid, Credit note, and Void.
- Derive Part-paid from recorded payments and the remaining invoice balance so it reflects the real payment state.
- Filter the invoice rows immediately when the selection changes.
- Recalculate every summary card from the selected invoices: Outstanding, Collected, Invoices, and Prepaid liability.
- Show a clear empty state when no invoices match the selected status.

## Technical details

- Keep the change within the existing Billing page and billing calculation helpers.
- Associate collected payments and sold-package liabilities with the invoices that remain after filtering.
- Preserve the existing behaviour when “All statuses” is selected.
- Add focused tests for status classification and run the existing billing tests and type checks.
