# Auto-capture leads from Meta Ads — one-click connect

Goal: a clinic staff member connects Facebook/Instagram lead ads in about a minute, with no webhook URLs, tokens, or developer steps. All technical work (Meta app, webhook, signature verification, token exchange) happens once behind the scenes and is reused by every clinic user.

## What the clinic sees

Settings → **Lead capture** tab:

1. **"Connect Facebook" button** — opens Meta's login popup, the user picks the Facebook Page(s) tied to their ads, and approves. No copy-paste of anything.
2. **Connected state** — shows Page name, profile picture, connection health, and a Disconnect button.
3. **Choose forms** — after connecting, the app lists the lead forms already on that Page with simple toggles ("Capture leads from this form"). No form setup required inside the CRM; forms stay where the marketer builds them.
4. **Field mapping** — for each enabled form, the app shows the form's questions on the left and CRM fields (Name, Phone, Email, Treatment interest, City, Notes) on the right. Obvious matches are pre-selected automatically; the user only fixes what looks wrong and hits Save.
5. **Test** — "Send a test lead" uses Meta's own test-lead tool result (or a sample from the form definition) to create a lead so the staff sees exactly how it will appear in the Leads table.
6. **Live status** — last lead received, leads captured in the last 7 days, and any error in plain English ("Facebook connection expired — reconnect").

Total user actions: click Connect → pick page → toggle a form → confirm mapping. Everything else is automatic.

```text
[Connect Facebook] → pick Page → forms list (toggles) → auto-mapped fields (confirm) → live
```

## What happens automatically

- Webhook subscription for the selected Page is created by the app through the Graph API — the user never sees a URL.
- Short-lived login token is exchanged for a long-lived page token and stored server-side, encrypted, never sent to the browser.
- Incoming lead notifications are signature-verified, the full answers are fetched from Meta, mapped, deduped by Meta's lead id, and inserted into Leads with source (Instagram / Facebook / WhatsApp), source group "Meta Ads", stage New, and a follow-up date.
- Historical leads: on connect, the last 30 days of existing leads from the selected forms are backfilled so the table isn't empty.
- Token expiry is detected and surfaced as a single "Reconnect" button.

## Fallback for edge cases

An "Advanced" disclosure keeps the manual path (paste page token / verify token) for clinics whose ad account is managed by an outside agency that won't grant login access.

## Technical notes

- Requires one Meta app owned by the product (not per clinic), configured once with Facebook Login for Business, `pages_show_list`, `pages_manage_metadata`, `leads_retrieval`, and Advanced Access review. Its app id is public config; the app secret is a project secret. This is the only setup step, and it is done once by us, not by clinics.
- OAuth: `/api/public/hooks/meta-oauth-callback` handles the redirect, exchanges code → user token → long-lived page tokens via server-side calls; state is signed to prevent CSRF.
- Webhook: rewrite `src/routes/api/public/hooks/meta-leads.tsx` for the real payload — GET verification handshake, POST with `x-hub-signature-256` HMAC check over the raw body, then per `entry[].changes[].value.leadgen_id` fetch and insert.
- New `src/lib/meta-leads.server.ts` (Graph API calls, field mapping, insert via `supabaseAdmin`) and `src/lib/meta-leads.functions.ts` (admin-gated server functions: start connect, list pages/forms, save mapping, disconnect, status, test lead, backfill).
- Migration: `meta_connections` (page id/name, encrypted long-lived token, status, last_lead_at), `meta_lead_forms` (form id/name, enabled, field mapping JSON), unique partial index on `leads.external_id` for dedupe. Staff-role RLS plus GRANTs; token column readable only by service role.
- UI: `src/components/clinic/LeadCaptureTab.tsx` added to the Settings tabs, following the existing PaymentsTab pattern.

## What I need from you

Only the Meta app credentials (app id + app secret) for the product-level Meta app, requested through the secure secret prompt when I reach that step. If you don't have a Meta app yet, I'll build the flow with the manual fallback working first, and the one-click connect activates as soon as the credentials are added.
