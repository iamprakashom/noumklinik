# Make the clinic app properly responsive

## What's actually broken

I audited the shell, every authenticated page and the shared clinic components. The app is built desktop-only in a few specific places:

1. **The sidebar never collapses.** `AppShell` renders a fixed 176px sidebar at every width, with no mobile menu. On a phone that eats ~45% of the screen and the content column is squeezed to unusable width.
2. **Fixed 32px page padding.** The header and main area use `px-8` / `p-8` with no smaller value on mobile, wasting more of an already narrow screen.
3. **Two data tables can't scroll sideways.** Patients and Billing tables have no horizontal scroll wrapper, so their columns get crushed or overflow the page. (Appointments, Leads and Reports already have the wrapper — those are fine.)
4. **Tab bars overflow.** Settings has ~10 tabs, Reports and the patient chart several more, all in a non-scrolling row. On mobile the later tabs are unreachable.
5. **Some stat grids break too early.** Billing shows 4 stat cards from the 640px breakpoint, which is far too tight. Invoice line-item rows and package rows use fixed column widths that don't fit a phone.
6. **Dialogs can overflow the viewport.** Several forms (new patient, new appointment, new lead, settings forms) have no max height or internal scroll, so on a short screen the Save button ends up off-screen.
7. **Inbox thread height** is a fixed `60vh` and the conversation list stacks awkwardly below `lg`.

## Implementation plan

**1. Responsive app shell (biggest win)**
- Below `lg`, hide the sidebar and add a top bar with a hamburger that opens the same nav inside a slide-in sheet; auto-close on navigation.
- Keep the desktop sidebar exactly as it is at `lg` and above.
- Scale padding: `px-4 py-4` on mobile up to the current `px-8 py-5` / `p-8` on desktop.
- Let the page title wrap and allow header actions to wrap to a second line instead of squashing.

**2. Tables**
- Wrap the Patients and Billing tables in the same `overflow-x-auto` container the other pages use, with a sensible minimum table width so columns stay legible while scrolling.
- On mobile, de-emphasise low-value columns (hide secondary columns below `sm`) so the common case needs no scrolling at all.

**3. Tab bars**
- Make Settings, Reports and patient-chart tab rows horizontally scrollable on small screens with the scrollbar hidden and edges not clipped.

**4. Grids and forms**
- Billing stats: 1 column on mobile, 2 at `sm`, 4 at `xl`.
- Invoice line items and package item rows: stack into a labelled block on mobile instead of fixed narrow columns.
- Add `max-h-[90vh] overflow-y-auto` plus full-width-on-mobile sizing to the dialogs that lack it, and make dialog footers stack their buttons on narrow screens.

**5. Inbox**
- Conversation list becomes a scrollable horizontal/stacked selector on mobile with the thread below; replace the fixed `60vh` with a flexible height that respects the mobile browser chrome (`dvh`).

**6. Verification**
- Walk every page at 390px, 768px and 1280px in a real browser and check: no horizontal page scroll, nav reachable, primary action reachable, all tabs reachable, dialogs fully usable.

## Technical notes

- All changes are Tailwind class and markup-level; no data, query or business logic changes.
- The mobile nav reuses the existing shadcn `Sheet` component already used by the Leads filter drawer, so no new dependencies.
- Print styles (`.print-scope`) stay untouched; new wrappers will be verified not to interfere with invoice and day-close printing.

Files touched: `src/components/clinic/AppShell.tsx`, `src/routes/_authenticated/{dashboard,appointments,billing,leads,inbox,reports,settings,automations}.tsx`, `src/routes/_authenticated/patients/{index,$patientId}.tsx`, a few clinic components (`PackagesTab`, `PatientPhotos`, `PaymentsTab`), and a small utility class in `src/styles.css`.
