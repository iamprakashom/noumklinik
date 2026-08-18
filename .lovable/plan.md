# Refine the workflow-stage section on the Dashboard

The eight stage boxes currently read as buttons in a 4x2 grid, which competes visually with the stat cards above and adds boxed clutter. Replace them with a quiet, Linear-style list of rows.

## What changes

In the "Campaigns by workflow stage" card:

- Remove the bordered box grid. Render one row per stage in the workflow order (Created through Completed), separated by hairline dividers instead of borders around each item.
- Each row: stage name on the left (14px, foreground), a muted count on the right (tabular numerals). No chrome at rest.
- Hover state: subtle background tint plus the stage name shifting to the accent color, and a small chevron fading in on the right so the row reads as navigable without looking like a button.
- Rows stay clickable and keep the existing link into the campaigns sheet filtered by that stage.
- Stages with zero campaigns render with a dimmed count so the eye skips them, but remain clickable.
- Keep the section header and the total-campaigns caption as they are.

```text
Campaigns by workflow stage              24 campaigns
------------------------------------------------------
Created                                          3
PM Assigned                                      2
Ideation                                         5   >   (hover)
Editing/Sampling                                 4
...
Completed                                        6
```

## Technical notes

- Only `src/routes/_authenticated/dashboard.tsx` changes; no data or routing logic is touched.
- Row markup stays a `Link` with `to="/campaigns"` and `search={{ stage }}`, restyled with `divide-y divide-border`, `hover:bg-accent/40`, `group-hover` transitions, and `transition-colors`.
- Colors use existing semantic tokens (`text-muted-foreground`, `text-primary`, `bg-accent`) — no new CSS variables.
