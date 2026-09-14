# Unified Inbox: WhatsApp, Instagram and Facebook Messenger

## Goal

Give clinic staff one Inbox for customer conversations from:

- WhatsApp
- Facebook Page Messenger
- Instagram Direct Messages

A clinic admin connects its Facebook Page once, selects the linked Instagram professional account, and enables the channels. Existing WhatsApp conversations and replies continue working throughout the change. WhatsApp inbox feature continue along with Facebook Page messanger and Instagram Direct Messages.

## Clinic experience

### Settings → Messaging

Replace the separate technical setup screens with channel connection rows:

- **WhatsApp** — keep the current connection and status.
- **Facebook Messenger** — Connect, page name/photo, connection health, reconnect, disconnect.
- **Instagram** — linked professional account, username/photo, connection health, reconnect, disconnect.

For Meta channels, the normal flow is:

```text
Connect Meta → sign in → select Facebook Page → confirm linked Instagram account → enable channels
```

Only clinic admins can connect or disconnect accounts. Other active clinic staff can use the Inbox.

### Unified Inbox

- One conversation list ordered by latest activity.
- Channel icon and label on every conversation and message.
- Filters for All, Unread, WhatsApp, Instagram and Messenger.
- Search by customer name, phone number or social username.
- Customer identity panel showing linked patient/lead when available.
- Replies are sent through the same channel that received the conversation; staff cannot accidentally switch channels.
- Text replies in the first release; received image, video, audio and file attachments render safely with download/open actions.
- Clear disabled composer with the provider's reason when a reply window or connection is unavailable.
- Desktop keeps the two-pane workflow; mobile uses conversation list → full-screen thread → back navigation.

## Technical implementation

### 1. Preserve WhatsApp and introduce a channel-neutral model

Add clinic-scoped tables rather than rewriting the working WhatsApp flow in place:

- `inbox_connections`: clinic, provider/channel, provider account/page IDs, display details, status, capabilities, last error, token metadata, timestamps.
- `inbox_conversations`: clinic, connection, channel, provider conversation ID, provider customer ID, display name/avatar, optional patient/lead links, last message/time, unread count, reply-window timestamp, status.
- `inbox_messages`: clinic, conversation, provider message ID, direction, text, message type, attachment metadata, delivery/read status, error, provider timestamp, local read timestamp.

Add unique constraints using clinic + channel + provider IDs so webhook retries cannot duplicate messages. Add indexes for latest conversations, unread filtering and thread pagination.

Every new public table receives explicit grants, row-level security, and policies scoped through active clinic membership. Provider tokens remain server-only and unreadable to browser users. Connection changes remain admin-only; message access is available to authorised clinic staff.

Do not delete `whatsapp_settings`, `whatsapp_messages` or `messages_outbox` in the first release. Backfill existing WhatsApp messages into the unified model, keep their original IDs for traceability, and temporarily dual-write new WhatsApp activity until reconciliation tests pass. This gives a reversible migration with no inbox downtime.

### 2. Extend the existing Meta connection safely

Reuse the working signed-state OAuth popup, code exchange, Page picker and page-token flow already used for Meta lead capture. Extend it to request the current permissions required by Meta for:

- Page discovery and Page metadata
- Facebook Page messaging
- Linked Instagram professional-account discovery
- Instagram message management

Before coding, confirm the exact current permission names and API version against Meta's live documentation because these change over time. Start with Page-linked Instagram professional accounts; do not mix in the separate Instagram-only login flow in the first release.

After page selection:

1. Fetch the Page and linked Instagram professional account.
2. Save only server-side account identifiers and credentials.
3. Subscribe the selected Page/account to the required messaging webhook fields.
4. Import recent conversations where Meta permits it.
5. Record capabilities independently, so Facebook can be live even if Instagram is not linked.

Keep Lead Ads settings and field mappings intact. A reconnect expands or renews permissions without deleting captured leads or existing conversations.

### 3. Webhook ingestion and routing

Create a dedicated Meta messaging public endpoint, separate from the existing lead webhook and WhatsApp webhook.

- Support Meta's GET verification handshake.
- Read the raw POST body first and verify `X-Hub-Signature-256` with the product Meta app secret before parsing.
- Validate payloads with Zod.
- Resolve the clinic from the recipient Page/Instagram account ID, never from browser input.
- Handle incoming messages, echoes of staff replies, delivery/read events and supported attachments.
- Upsert conversations and messages idempotently by provider IDs.
- Return quickly after durable storage; isolate malformed events so one event does not discard the rest of a batch.
- Log connection health and actionable errors without logging tokens or message content unnecessarily.

Retain the current WhatsApp endpoint, but adapt its storage step to the same conversation/message service. Add explicit clinic filters to authenticated reads as defence in depth even though row-level security already scopes them.

### 4. Channel adapters and reply rules

Create a small server-only adapter contract:

```text
list/backfill conversations
normalise webhook event
send text reply
fetch attachment metadata
check reply eligibility
check connection health
```

Implement adapters for WhatsApp, Messenger and Instagram. Inbox server functions call the adapter selected by the conversation's stored channel; the browser never supplies arbitrary credentials or provider endpoints.

Enforce provider policy on the server:

- A Facebook or Instagram thread must be customer-initiated before a normal reply.
- Free-form replies respect Meta's current messaging window and allowed exceptions.
- WhatsApp keeps its current 24-hour/template behavior.
- Failed sends remain visible in the thread with a safe retry action.
- Delivery/read events update the existing outgoing row rather than creating duplicates.

### 5. Replace WhatsApp-only Inbox functions incrementally

Add channel-neutral authenticated server functions for:

- paginated conversation list with channel/unread/search filters
- paginated thread loading and mark-read
- send reply
- retry failed reply
- link/unlink conversation to a lead or patient
- connection summary and health

Keep the existing WhatsApp functions operational until the unified queries are verified. Then point `/inbox` at the new functions without changing the route, navigation link or existing user permissions.

Use cursor pagination rather than scanning the latest 500 messages every 20 seconds. Keep short polling initially for reliability; real-time updates can be added later without changing the data model.

### 6. Responsive Inbox redesign

Refactor the current Inbox into focused parts:

- channel/search/filter toolbar
- paginated conversation list
- thread header and message timeline
- channel-aware composer
- linked patient/lead summary
- connection/empty/error states

Preserve the current restrained visual system. Use stable widths and heights, accessible labels, keyboard focus, readable status indicators and no nested cards. Verify at 390px, 768px and 1280px, including long names, attachments, empty states, send failures and expired reply windows.

### 7. Settings, monitoring and lifecycle

- Consolidate WhatsApp and Meta messaging under **Settings → Messaging** while leaving Lead capture as its own feature.
- Show Connected, Attention needed, Expired and Disconnected states per channel.
- Add server-side token diagnostics and a single Reconnect action.
- On disconnect, unsubscribe where supported, revoke/delete stored credentials, stop new ingestion and retain historical conversations according to clinic retention policy.
- Add Meta data-deletion callback/confirmation handling, privacy-policy coverage and auditable connection events.

## Meta prerequisites outside the codebase

A product-owned Meta app must be configured once for all clinics. Production access requires:

- Meta business verification where required.
- App Review and Advanced Access for the approved Page/Instagram messaging permissions.
- Registered OAuth redirect URI and webhook callback.
- Privacy-policy and user-data-deletion URLs.
- Review screencasts showing connection, incoming messages, staff replies and disconnect/data deletion.

Development can be completed and tested with app-role/test accounts before approval, but real clinics cannot use the integration until Meta approves the required access.

## Compatibility and rollout

### Phase 1 — foundation

Create the unified schema, policies, adapters and WhatsApp backfill/dual-write. Verify old WhatsApp threads, templates, automations and delivery statuses remain correct.

### Phase 2 — Meta connection

Expand the existing Meta OAuth flow, account discovery, subscriptions, health checks and reconnect behavior. Keep lead capture unchanged.

### Phase 3 — Facebook Messenger

Ingest, display and reply to Page conversations. Verify deduplication, ordering, reply-window enforcement and clinic isolation.

### Phase 4 — Instagram Direct

Enable the linked professional account through the same connection, then verify text, attachments and policy states.

### Phase 5 — unified UI and cutover

Switch `/inbox` to channel-neutral APIs, retain the legacy WhatsApp tables during an observation period, reconcile counts/statuses, then stop dual-writing only after production confidence.

## Verification checklist

- Existing WhatsApp conversation, reply, template and automation flows still pass.
- Two clinics connected to different Meta assets cannot read, send to or infer each other's conversations.
- Duplicate and out-of-order webhooks do not create duplicate messages or regress status.
- Reconnect preserves history; disconnect stops ingestion and sending.
- Replies always use the conversation's original channel and correct clinic credential.
- Expired windows, revoked permissions and provider failures produce actionable states.
- Threads paginate correctly and remain usable with high message volume.
- Desktop, tablet and mobile layouts are verified with keyboard and screen-reader basics.
- Type checks, focused tests, full tests and production build pass.