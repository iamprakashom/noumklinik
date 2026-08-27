# Leads page: pagination, mobile filters, shareable URLs, accessibility

Four improvements to the Leads list, all frontend.

## 1. URL-backed filters and sort

Search, all four filters, follow-up state, sort and page number move into the page URL. Refreshing keeps your view, and you can copy the link to a colleague and they see the same filtered list. Defaults stay out of the URL so a clean page keeps a clean address.

## 2. Pagination that resets correctly

- 25 leads per page, with a footer showing "Showing 1–25 of 132" and Previous / Next plus numbered pages.
- Changing search, any filter, or sort resets to page 1 automatically.
- If a row is converted/removed and the current page ends up empty, the view clamps back to the last valid page instead of showing nothing.

## 3. Mobile filter sheet

On small screens the "Filters" button opens a bottom sheet listing every filter plus sort in full-width rows, with a count badge on the button. The sheet holds changes as a draft and applies them only on "Apply filters"; "Reset" clears everything. Closing without applying discards the draft. Desktop keeps the current inline toolbar.

## 4. Keyboard and screen-reader polish

- Consistent visible focus rings on the search box, every filter select, sort, chips and pagination controls.
- Escape clears the search field; each filter select is labelled and announces its current value.
- Filter chips are real buttons labelled "Remove <filter>: <value>", the chip row is grouped and labelled "Active filters".
- A polite live region announces the result count when filters change; pagination gets a labelled nav landmark and aria-current on the active page.

## Technical notes

- `validateSearch` with `zodValidator` + `fallback()` on `/_authenticated/leads` for keys `q, stage, treatment, group, doctor, followUp, sort, page`; state read via `Route.useSearch()` and written with `navigate({ search: prev => ... })`, resetting `page: 1` on any non-page change. `stripSearchParams` removes defaults from the URL.
- Install `@tanstack/zod-adapter` (zod already present).
- Pagination is plain slicing of the existing filtered `useMemo` result — no virtualization needed at this data size; page clamped with `Math.min(page, pageCount)`.
- Mobile sheet uses the existing `src/components/ui/sheet.tsx`; draft state lives in `LeadsToolbar` and commits through the same `onChange` callbacks.
- `LeadsToolbar` keeps its current props shape, extended with `page`/`onPageChange` handled by a new small `Pagination` block below the table in `leads.tsx`.
