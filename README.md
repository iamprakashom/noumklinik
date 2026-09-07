# Noum Klinik

A modern clinic management system for MedSpa and aesthetic clinics — built to handle appointments, patient records, lead follow-up, billing, and daily operations in one minimal interface.

## What it does

- **Dashboard** — quick overview of today's appointments, revenue, leads, and treatment activity.
- **Appointments** — schedule, reschedule, assign doctors, tag leads as hot/warm/cold, and send reminders across WhatsApp / SMS / email.
- **Leads** — capture and manage leads from Meta Ads (Instagram, WhatsApp, Facebook), Google Ads, and walk-ins. Tabular default view with filters by status, treatment, source, and doctor. Sort by ageing and follow-up due date.
- **Patients** — complete patient directory with treatment history, consent, photos, and charts.
- **Team** — staff directory with roles, workload, and invite flow.
- **Billing** — invoices and payments in Indian Rupees (₹), with EMI, UPI, and upsell add-on discounts.
- **Automations** — reminder rules, follow-up scheduling, and message templates.
- **Settings** — clinic configuration, payment gateway integration (Razorpay / Cashfree), Meta lead capture, and automation outbox.

## Design

Minimal, dense, functional. Dark mode for the trend-intelligence view; light, clinical palette (teal-sage) for the clinic CRM. No gradients or heavy illustration — a daily-use tool, not a marketing page.

## Tech stack

- [TanStack Start](https://tanstack.com/start) — full-stack React framework
- [React](https://react.dev) 19 + [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Lovable Cloud](https://lovable.dev/cloud) — backend, auth, and database
- [Supabase](https://supabase.com) — PostgreSQL database with Row-Level Security (RLS)

## Development

This project was built with [Lovable](https://lovable.dev).

Continue developing in the [Lovable editor](https://lovable.dev/projects/980abdb4-4619-4749-acf2-472f5f0cbc1e).

Prefer working locally?

```sh
git clone <this-repository-url>
cd <repository-name>
bun i
bun run dev
```
