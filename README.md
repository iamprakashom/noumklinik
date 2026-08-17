# Maeby CRM

Design a clean, modern SaaS CRM dashboard for a music marketing agency, 

in the visual style of Linear or Notion — minimal, fast, dense, no clutter.

Color system: near-white background (#FAFAFA), dark near-black text (#1A1A1A), 

one accent color (indigo #5B5FEF) reserved only for active states and 

primary buttons. Status colors: green for Completed, amber for In Progress, 

red for Overdue/Rejected, gray for Not Started.

Typography: Inter or similar geometric sans-serif. Clear hierarchy — 

14px body, 12px metadata/labels, 20-24px headers.

Screens to design (desktop, 1440px wide):

1. DASHBOARD — Top row of 4 stat cards (Total Campaigns, Active, Completed, 

Pending). Below, a horizontal stacked bar showing campaign count per 

workflow stage (Created, PM Assigned, Ideation, Editing/Sampling, Approval, 

Execution, Reporting, Completed). Left sidebar nav with icons: Dashboard, 

Campaigns, People, Settings.

2. CAMPAIGN BOARD — Kanban view with 8 columns matching the workflow stages 

above. Each card shows: Client name, Campaign/Song title, small PM avatar 

circle, deadline as a small colored chip (red if overdue, amber if <3 days, 

gray otherwise), and a thin progress bar for deliverables completed. Include 

a "+ New Campaign" button top right and a filter bar (by PM, by Client) 

above the board.

3. CAMPAIGN DETAIL — Right-side slide-over panel (not full page) triggered 

from clicking a card. Shows: Client, Song, PM + Executor avatars, deadline, 

current stage as a horizontal stepper across the top, deliverables checklist 

below, and a prominent "Reject to Editor" red outline button visible only 

when status is Approval.

4. PEOPLE / WORKLOAD — Simple data table: Name, Role (PM/Editor/Executor), 

Active Campaigns count, Deliverables Pending, Upcoming Deadline. Sort by 

column headers. Highlight rows where Active Campaigns > 5 in a subtle 

amber tint to flag overload.

Keep spacing generous (8px grid), rounded corners at 8px on cards, subtle 

shadows only on hover states. No gradients, no heavy illustration — this 

is a functional daily-use tool, not a marketing page.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/980abdb4-4619-4749-acf2-472f5f0cbc1e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
