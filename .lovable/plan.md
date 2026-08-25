# Auto-capture leads from Meta Ads

Today the app has a webhook endpoint for lead capture, but it only accepts a simplified custom payload (name/email/phone posted directly). Real Meta Lead Ads webhooks send a notification with a `leadgen_id` only — the actual answers must then be fetched from the Meta Graph API. This plan makes that real flow work end to end.

## How it will work

1. Meta sends a subscription verification request when the webhook is connected; the endpoint answers it with the verify token (already supported, kept).
2. When someone submits a lead form on Instagram, Facebook or WhatsApp Click-to-Form, Meta posts a notification to the endpoint.
3. The endpoint verifies the request signature against the app secret and rejects anything unsigned or tampered with.
4. For each notification, the app calls Meta to fetch the full lead answers (name, phone, email, plus any custom questions such as treatment of interest and preferred city).
5. The lead is saved into Leads with:
   - Source set from the ad platform (Instagram / Facebook / WhatsApp) and source group "Meta Ads"
   - Stage "New", temperature "Warm" by default
   - Treatment interest matched to a service in the catalog when the form answer matches a service name
   - Ad/form/campaign names stored in notes for attribution
   - `external_id` = Meta's leadgen id, so re-delivered notifications never create duplicates
6. Optional follow-up automation: newly captured leads get a next-follow-up time set a configurable number of hours ahead, so they appear in the existing Overdue/Scheduled follow-up lists.

## Setup screen

A new "Lead capture" tab in Settings showing:
- The webhook URL to paste into the Meta app (read-only, copy button)
- Fields to store the Meta verify token, app secret and page access token (write-only, masked once saved — same pattern as the payment gateway settings)
- Connection status, last received lead time, and a count of leads captured in the last 7 days
- A "Test capture" button that inserts a sample lead through the same mapping path so the clinic can confirm the pipeline before going live

## Failure handling

- Signature failures return 401 and are not stored.
- Graph API failures are retried once; if still failing, a minimal lead row is created with the leadgen id and a note so nothing is lost.
- All duplicates are ignored by leadgen id.

## Technical notes

- Rewrite `src/routes/api/public/hooks/meta-leads.tsx`: keep the GET handshake, replace POST with signature verification (`x-hub-signature-256`, HMAC-SHA256 over the raw body, timing-safe compare) and iterate `entry[].changes[].value`.
- New `src/lib/meta-leads.server.ts` holds the Graph API fetch (`GET /{leadgen_id}?access_token=...`), field-name normalisation, service matching, and the insert via `supabaseAdmin`.
- Credentials read from server env only, inside handlers: `META_VERIFY_TOKEN` (exists), plus new `META_APP_SECRET` and `META_PAGE_ACCESS_TOKEN` requested through the secure secret prompt.
- Migration: add a unique index on `leads.external_id` (partial, where not null) for dedupe; add a `lead_capture_settings` singleton table for non-secret display state (last received at, enabled flag) with staff-role RLS and GRANTs.
- Settings UI: new `src/components/clinic/LeadCaptureTab.tsx` plus server functions in `src/lib/meta-leads.functions.ts` (admin-gated, same role check pattern as payments).

## What I'll need from you

Meta app secret, a long-lived page access token with `leads_retrieval`, and the verify token you want to use. The build works without them — capture stays disabled until they're added.
