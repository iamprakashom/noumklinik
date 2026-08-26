# Leads filter & sort — UI audit and redesign

## What's wrong today

The Leads page puts five identical dropdowns in one flat row: statuses, treatments, sources, doctors, sort. Problems:

1. **No hierarchy.** Sort looks exactly like a filter, so users can't tell "narrowing the list" apart from "reordering the list".
2. **No feedback.** Nothing shows how many leads are being shown vs hidden, and there's no way to tell at a glance that a filter is active — a selected dropdown looks the same as an untouched one.
3. **No reset.** Once three filters are set, the only way back is to change each one individually.
4. **Fixed widths** (`w-40`, `w-44`, `w-48`) wrap awkwardly at narrower widths and don't match the label lengths.
5. **Search is missing.** The most common action on a lead list — "find Priya" — has no entry point, so users filter as a substitute.
6. **The two summary cards above (overdue / scheduled follow-ups) are read-only**, even though they name the exact segments people want to filter to.

## Recommended design

A single toolbar rail above the table, in three zones:

```text
[ Search leads…            ]   [Status v] [Treatment v] [Source v] [Doctor v]   [Sort: Ageing v]
  Showing 24 of 61 · Status: New · Doctor: Dr. Rao        [Clear all]
```

- **Left:** search input with a magnifier icon, filtering name / phone / email.
- **Middle:** the four filters, visually grouped, each dropdown showing an accent-tinted border and its value when active (rather than "All …").
- **Right, separated by a divider:** sort, prefixed with the word "Sort" so it never reads as a filter.
- **Second line:** result count plus removable chips for each active filter and a "Clear all" link. The row disappears entirely when nothing is applied, so the default view stays quiet.
- **Make the two follow-up cards clickable** — clicking "Overdue follow-ups" applies an overdue filter (appearing as a chip like any other), turning the stat into a shortcut.
- Filters collapse behind a single "Filters (2)" button below `sm` so the toolbar stays one line on mobile.
- Consistent control height (h-9), auto width, 8px gaps, no fixed pixel widths.

Keeps the existing tokens, `inputClass`, and Chip component — no new color or type decisions.

## Technical notes

- All work in `src/routes/_authenticated/leads.tsx` plus one new presentational `LeadsToolbar` component in `src/components/clinic/`.
- Extend existing local state with `query` (search) and `followUp` (`all | overdue | scheduled`); the existing `useMemo` filter chain absorbs both.
- Active-filter chips derive from the same state — no duplicate source of truth.
- No data-layer, schema, or query changes.

## Out of scope

Saved views, multi-select filters, and URL-persisted filter state — worth doing later, flagged but not built here.
