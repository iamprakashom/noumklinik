/** Server-only helpers for Facebook / Instagram lead ads capture. */

const GRAPH = "https://graph.facebook.com/v20.0";

export type MetaConnection = {
  id: string;
  page_id: string;
  page_name: string;
  page_picture_url: string | null;
  page_access_token: string | null;
  user_access_token: string | null;
  status: string;
  error_message: string | null;
  last_lead_at: string | null;
};

export type LeadForm = {
  id: string;
  connection_id: string;
  form_id: string;
  form_name: string;
  enabled: boolean;
  field_map: Record<string, string>;
  questions: { key: string; label: string; options?: string[] }[];
  field_confidence?: { scores?: Record<string, number>; reasons?: Record<string, string> } | null;
  confirmed_keys?: string[] | null;
  needs_review?: boolean | null;
  auto_apply?: boolean | null;
};

export function metaAppConfig() {
  const appId = process.env["META_APP_ID"] ?? null;
  const appSecret = process.env["META_APP_SECRET"] ?? null;
  return { appId, appSecret, configured: Boolean(appId && appSecret) };
}

async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const json = (await res.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null;
  if (!res.ok || !json || json.error) {
    throw new Error(json?.error?.message ?? `Meta request failed (${res.status})`);
  }
  return json;
}

/* ---------------------------------------------------------------- connection */

export async function loadConnection(clinicId: string): Promise<MetaConnection | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("meta_connections")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as MetaConnection | null) ?? null;
}

/** Webhooks arrive with a page id, which is what tells us the owning clinic. */
export async function loadConnectionByPageId(pageId: string): Promise<MetaConnection | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("meta_connections")
    .select("*")
    .eq("page_id", pageId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as MetaConnection | null) ?? null;
}

export async function saveConnection(
  clinicId: string,
  values: Record<string, string | null>,
  id?: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (id) {
    const { error } = await supabaseAdmin.from("meta_connections").update(values as never).eq("id", id);
    if (error) throw new Error(error.message);
    return id;
  }
  const { data, error } = await supabaseAdmin
    .from("meta_connections")
    .insert({ clinic_id: clinicId, singleton: true, page_id: "", page_name: "", ...values } as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/* --------------------------------------------------------------------- oauth */

/** Signed, time-bounded state so the popup callback can't be forged. */
export async function signState(clinicId: string): Promise<string> {
  const { appSecret } = metaAppConfig();
  const payload = `${Date.now()}~${clinicId}`;
  const sig = await hmacHex(appSecret ?? "dev", payload);
  return `${payload}.${sig}`;
}

/** Returns the clinic the popup started from, or null when the state is not ours. */
export async function verifyState(state: string): Promise<string | null> {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const [issued, clinicId] = payload.split("~");
  if (!issued || !clinicId) return null;
  if (Date.now() - Number(issued) > 15 * 60_000) return null;
  const { appSecret } = metaAppConfig();
  const ok = timingSafeEqualHex(await hmacHex(appSecret ?? "dev", payload), sig);
  return ok ? clinicId : null;
}

async function hmacHex(secret: string, body: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyWebhookSignature(header: string | null, rawBody: string) {
  const { appSecret } = metaAppConfig();
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  return timingSafeEqualHex(await hmacHex(appSecret, rawBody), header.slice(7));
}

export function loginUrl(redirectUri: string, state: string) {
  const { appId } = metaAppConfig();
  const url = new URL("https://www.facebook.com/v20.0/dialog/oauth");
  url.searchParams.set("client_id", appId ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    "pages_show_list,pages_manage_metadata,leads_retrieval,pages_read_engagement",
  );
  return url.toString();
}

export async function exchangeCodeForUserToken(code: string, redirectUri: string) {
  const { appId, appSecret } = metaAppConfig();
  const short = await graph<{ access_token: string }>("oauth/access_token", {
    client_id: appId ?? "",
    client_secret: appSecret ?? "",
    redirect_uri: redirectUri,
    code,
  });
  const long = await graph<{ access_token: string }>("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId ?? "",
    client_secret: appSecret ?? "",
    fb_exchange_token: short.access_token,
  });
  return long.access_token;
}

export type PageOption = { id: string; name: string; picture: string | null; token: string };

export async function listPages(userToken: string): Promise<PageOption[]> {
  const res = await graph<{
    data: { id: string; name: string; access_token: string; picture?: { data?: { url?: string } } }[];
  }>("me/accounts", { access_token: userToken, fields: "id,name,access_token,picture" });
  return res.data.map((p) => ({
    id: p.id,
    name: p.name,
    picture: p.picture?.data?.url ?? null,
    token: p.access_token,
  }));
}

/** Subscribes our app to leadgen notifications for the page — no user action needed. */
export async function subscribePage(pageId: string, pageToken: string) {
  const url = new URL(`${GRAPH}/${pageId}/subscribed_apps`);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscribed_fields: "leadgen", access_token: pageToken }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? "Could not subscribe to lead notifications");
  }
}

/* ---------------------------------------------------------------------- forms */

export async function fetchForms(pageId: string, pageToken: string) {
  const res = await graph<{
    data: {
      id: string;
      name: string;
      questions?: {
        key?: string;
        type?: string;
        label?: string;
        options?: { key?: string; value?: string }[];
      }[];
    }[];
  }>(`${pageId}/leadgen_forms`, { access_token: pageToken, fields: "id,name,questions" });
  return res.data.map((f) => ({
    form_id: f.id,
    form_name: f.name,
    questions: (f.questions ?? []).map((q) => ({
      key: q.key ?? q.type ?? "",
      label: q.label ?? q.key ?? q.type ?? "",
      options: (q.options ?? []).map((o) => o.value ?? o.key ?? "").filter(Boolean),
    })),
  }));
}

export const CRM_FIELDS = [
  "full_name",
  "email",
  "phone",
  "interest",
  "city",
  "notes",
  "ignore",
] as const;

/** Everything at or above this scores as "certain" and is applied without asking. */
export const CONFIDENT_AT = 0.7;
/** Below this we always ask the user to confirm. */
export const UNSURE_BELOW = 0.4;

export type Suggestion = { target: string; confidence: number; reason: string };

/** Meta's own standardised question keys — these are unambiguous. */
const STANDARD_KEYS: Record<string, string> = {
  full_name: "full_name",
  first_name: "full_name",
  last_name: "full_name",
  name: "full_name",
  email: "email",
  phone_number: "phone",
  phone: "phone",
  city: "city",
  street_address: "city",
  post_code: "city",
};

const SYNONYMS: { target: string; exact: string[]; strong: RegExp; weak?: RegExp }[] = [
  {
    target: "full_name",
    exact: ["name", "full name", "your name", "patient name", "पूरा नाम"],
    strong: /\b(full[_ ]?name|your name|patient name|first name|last name)\b/,
    weak: /name/,
  },
  {
    target: "email",
    exact: ["email", "email address", "e-mail"],
    strong: /\b(e-?mail|email address)\b/,
    weak: /mail/,
  },
  {
    target: "phone",
    exact: ["phone", "phone number", "mobile", "mobile number", "whatsapp number", "contact number"],
    strong: /\b(phone|mobile|whatsapp|contact number|cell)\b/,
    weak: /number|contact|call/,
  },
  {
    target: "interest",
    exact: ["treatment", "service", "which treatment", "treatment of interest", "interested in"],
    strong: /\b(treatment|service|procedure|interested in|concern|looking for)\b/,
    weak: /interest|problem|issue|goal/,
  },
  {
    target: "city",
    exact: ["city", "location", "area", "which city"],
    strong: /\b(city|location|area|pincode|pin code|zip|address)\b/,
    weak: /where|near/,
  },
];

function normalise(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreQuestion(
  q: { key: string; label: string; options?: string[] },
  serviceNames: string[],
): Suggestion {
  const key = normalise(q.key);
  const label = normalise(q.label || q.key);

  const std = STANDARD_KEYS[key.replace(/\s/g, "_")];
  if (std) return { target: std, confidence: 1, reason: `Facebook's standard "${q.key}" field` };

  for (const s of SYNONYMS) {
    if (s.exact.includes(label)) {
      return { target: s.target, confidence: 0.9, reason: `Question is titled "${q.label}"` };
    }
  }
  for (const s of SYNONYMS) {
    const hit = label.match(s.strong) ?? key.match(s.strong);
    if (hit) return { target: s.target, confidence: 0.7, reason: `Matched on "${hit[0]}"` };
  }

  // A multiple-choice question whose answers look like our services is a treatment picker.
  const options = (q.options ?? []).map(normalise).filter(Boolean);
  if (options.length > 0 && serviceNames.length > 0) {
    const names = serviceNames.map(normalise).filter(Boolean);
    const overlap = options.filter((o) => names.some((n) => o.includes(n) || n.includes(o)));
    if (overlap.length > 0) {
      return {
        target: "interest",
        confidence: overlap.length >= Math.max(2, options.length / 2) ? 0.7 : 0.5,
        reason: `Answers match your services (${overlap.length} of ${options.length})`,
      };
    }
  }

  for (const s of SYNONYMS) {
    if (!s.weak) continue;
    const hit = label.match(s.weak) ?? key.match(s.weak);
    if (hit) return { target: s.target, confidence: 0.5, reason: `Possibly about "${hit[0]}"` };
  }

  return { target: "notes", confidence: 0.2, reason: "No clear match — saved to notes" };
}

/**
 * Scores every question against the CRM fields. Single-value fields (name,
 * email, phone, city) can only be claimed once — the highest score wins and
 * losers drop to notes with low confidence so the user is asked.
 */
export function suggestMap(
  questions: { key: string; label: string; options?: string[] }[],
  serviceNames: string[] = [],
): Record<string, Suggestion> {
  const scored = questions.map((q) => ({ key: q.key, ...scoreQuestion(q, serviceNames) }));
  const UNIQUE = new Set(["full_name", "email", "phone", "city"]);
  const claimed = new Map<string, { key: string; confidence: number }>();

  for (const s of [...scored].sort((a, b) => b.confidence - a.confidence)) {
    if (!UNIQUE.has(s.target)) continue;
    const held = claimed.get(s.target);
    if (!held) claimed.set(s.target, { key: s.key, confidence: s.confidence });
  }

  const out: Record<string, Suggestion> = {};
  for (const s of scored) {
    const held = claimed.get(s.target);
    if (held && held.key !== s.key) {
      out[s.key] = {
        target: "notes",
        confidence: 0.3,
        reason: `Another question already maps to this field`,
      };
    } else {
      out[s.key] = { target: s.target, confidence: s.confidence, reason: s.reason };
    }
  }
  return out;
}

/** Flat key -> target map, for callers that don't care about confidence. */
export function autoMap(
  questions: { key: string; label: string; options?: string[] }[],
  serviceNames: string[] = [],
) {
  const map: Record<string, string> = {};
  for (const [key, s] of Object.entries(suggestMap(questions, serviceNames))) map[key] = s.target;
  return map;
}

export function reviewSummary(
  questions: { key: string }[],
  confidence: Record<string, number>,
  confirmed: string[],
) {
  const done = new Set(confirmed);
  const unsure = questions.filter((q) => !done.has(q.key) && (confidence[q.key] ?? 0) < CONFIDENT_AT);
  return { total: questions.length, unsure: unsure.length, needsReview: unsure.length > 0 };
}

async function activeServiceNames(clinicId: string): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("services")
    .select("name")
    .eq("clinic_id", clinicId)
    .eq("active", true);
  return (data ?? []).map((s) => s.name as string);
}

export async function saveForms(
  clinicId: string,
  connectionId: string,
  forms: { form_id: string; form_name: string; questions: { key: string; label: string; options?: string[] }[] }[],
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const services = await activeServiceNames(clinicId);
  const { data: existing } = await supabaseAdmin
    .from("meta_lead_forms")
    .select("id, form_id, field_map, field_confidence, confirmed_keys, auto_apply")
    .eq("connection_id", connectionId);
  const known = new Map((existing ?? []).map((f) => [f.form_id as string, f]));

  const fresh = forms.filter((f) => !known.has(f.form_id));
  if (fresh.length > 0) {
    const rows = fresh.map((f) => {
      const suggestions = suggestMap(f.questions, services);
      const field_map: Record<string, string> = {};
      const field_confidence: Record<string, number> = {};
      const field_reason: Record<string, string> = {};
      for (const [k, s] of Object.entries(suggestions)) {
        field_map[k] = s.target;
        field_confidence[k] = s.confidence;
        field_reason[k] = s.reason;
      }
      const summary = reviewSummary(f.questions, field_confidence, []);
      return {
        clinic_id: clinicId,
        connection_id: connectionId,
        form_id: f.form_id,
        form_name: f.form_name,
        enabled: true,
        questions: f.questions,
        field_map,
        field_confidence: { scores: field_confidence, reasons: field_reason },
        confirmed_keys: [] as string[],
        needs_review: summary.needsReview,
        auto_apply: true,
      };
    });
    const { error } = await supabaseAdmin.from("meta_lead_forms").insert(rows);
    if (error) throw new Error(error.message);
  }

  // Re-score existing forms, but never overwrite a mapping the user confirmed.
  for (const f of forms) {
    const row = known.get(f.form_id);
    if (!row) continue;
    const suggestions = suggestMap(f.questions, services);
    const confirmed = new Set(((row.confirmed_keys as string[] | null) ?? []) as string[]);
    const prevMap = ((row.field_map as Record<string, string> | null) ?? {}) as Record<string, string>;
    const field_map: Record<string, string> = {};
    const field_confidence: Record<string, number> = {};
    const field_reason: Record<string, string> = {};
    for (const [k, s] of Object.entries(suggestions)) {
      if (confirmed.has(k) && prevMap[k]) {
        field_map[k] = prevMap[k];
        field_confidence[k] = 1;
        field_reason[k] = "Confirmed by you";
      } else {
        field_map[k] = s.target;
        field_confidence[k] = s.confidence;
        field_reason[k] = s.reason;
      }
    }
    const summary = reviewSummary(f.questions, field_confidence, [...confirmed]);
    await supabaseAdmin
      .from("meta_lead_forms")
      .update({
        form_name: f.form_name,
        questions: f.questions,
        field_map,
        field_confidence: { scores: field_confidence, reasons: field_reason },
        needs_review: summary.needsReview,
      })
      .eq("id", row.id as string);
  }
}

export async function loadForms(connectionId: string): Promise<LeadForm[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("meta_lead_forms")
    .select("*")
    .eq("connection_id", connectionId)
    .order("form_name");
  return (data ?? []) as unknown as LeadForm[];
}

/* ---------------------------------------------------------------------- leads */

type FieldEntry = { name: string; values: string[] };

const PLATFORM_SOURCE: Record<string, string> = {
  ig: "Instagram",
  instagram: "Instagram",
  fb: "Facebook",
  facebook: "Facebook",
  wa: "WhatsApp",
};

export function buildLeadRow(
  entries: FieldEntry[],
  fieldMap: Record<string, string>,
  meta: { leadId: string; formName: string; platform?: string | undefined; createdAt?: string | undefined },
) {
  const out: Record<string, string> = {};
  const noteParts: string[] = [];
  for (const entry of entries) {
    const value = (entry.values ?? []).join(", ").trim();
    if (!value) continue;
    const target = fieldMap[entry.name] ?? "notes";
    if (target === "ignore") continue;
    if (target === "notes" || target === "city") {
      noteParts.push(`${entry.name}: ${value}`);
    } else if (!out[target]) {
      out[target] = value;
    }
  }
  noteParts.unshift(`Meta form: ${meta.formName}`);
  const source = PLATFORM_SOURCE[(meta.platform ?? "").toLowerCase()] ?? "Facebook";
  return {
    full_name: out["full_name"] ?? "Unnamed lead",
    email: out["email"] ?? null,
    phone: out["phone"] ?? null,
    interest: out["interest"] ?? null,
    notes: noteParts.join(" · "),
    external_id: meta.leadId,
    source,
    source_group: "Meta Ads",
    stage: "New",
    temperature: "Warm",
    next_follow_up_at: new Date(Date.now() + 2 * 3_600_000).toISOString(),
    created_at: meta.createdAt ?? new Date().toISOString(),
  };
}

/**
 * The mapping we actually ingest with. Low-confidence guesses the user has not
 * confirmed only apply when "auto-apply my best guess" is on; otherwise the
 * answer is kept verbatim in notes so nothing lands in the wrong field.
 */
export function effectiveFieldMap(form: LeadForm | undefined) {
  const map = { ...(form?.field_map ?? {}) };
  if (!form || form.auto_apply !== false) return map;
  const scores = form.field_confidence?.scores ?? {};
  const confirmed = new Set(form.confirmed_keys ?? []);
  for (const key of Object.keys(map)) {
    if (confirmed.has(key)) continue;
    if ((scores[key] ?? 0) < CONFIDENT_AT) map[key] = "notes";
  }
  return map;
}

export async function fetchLead(leadId: string, token: string) {
  return graph<{
    id: string;
    created_time?: string;
    platform?: string;
    form_id?: string;
    field_data?: FieldEntry[];
  }>(leadId, { access_token: token, fields: "id,created_time,platform,form_id,field_data" });
}

/** Inserts a lead, ignoring Meta redeliveries (unique external_id). */
export async function insertLead(clinicId: string, row: Record<string, unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("leads")
    .insert({ clinic_id: clinicId, ...row } as never);
  if (error && !error.message.includes("duplicate key")) throw new Error(error.message);
  return !error;
}

export async function captureLeadById(conn: MetaConnection, leadId: string, platform?: string) {
  if (!conn?.page_access_token) throw new Error("No connected Facebook page");
  const lead = await fetchLead(leadId, conn.page_access_token);
  const forms = await loadForms(conn.id);
  const form = forms.find((f) => f.form_id === lead.form_id);
  if (form && !form.enabled) return false;
  const row = buildLeadRow(lead.field_data ?? [], effectiveFieldMap(form), {
    leadId: lead.id,
    formName: form?.form_name ?? "Lead ad",
    platform: platform ?? lead.platform,
    createdAt: lead.created_time,
  });
  const inserted = await insertLead(conn.clinic_id, row);
  if (inserted) {
    await saveConnection(
      conn.clinic_id,
      { last_lead_at: new Date().toISOString(), error_message: null },
      conn.id,
    );
  }
  return inserted;
}

/** Pulls recent existing leads so the table isn't empty right after connecting. */
export async function backfillForm(conn: MetaConnection, form: LeadForm, sinceDays = 30) {
  if (!conn.page_access_token) return 0;
  const since = Math.floor((Date.now() - sinceDays * 86_400_000) / 1000);
  const res = await graph<{ data: { id: string; created_time?: string; platform?: string; field_data?: FieldEntry[] }[] }>(
    `${form.form_id}/leads`,
    {
      access_token: conn.page_access_token,
      fields: "id,created_time,platform,field_data",
      filtering: JSON.stringify([{ field: "time_created", operator: "GREATER_THAN", value: since }]),
      limit: "100",
    },
  );
  let count = 0;
  for (const lead of res.data) {
    const row = buildLeadRow(lead.field_data ?? [], effectiveFieldMap(form), {
      leadId: lead.id,
      formName: form.form_name,
      platform: lead.platform,
      createdAt: lead.created_time,
    });
    if (await insertLead(conn.clinic_id, row)) count++;
  }
  return count;
}
