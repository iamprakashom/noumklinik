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
  questions: { key: string; label: string }[];
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

export async function loadConnection(): Promise<MetaConnection | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("meta_connections")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as MetaConnection | null) ?? null;
}

export async function saveConnection(values: Record<string, string | null>, id?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (id) {
    const { error } = await supabaseAdmin.from("meta_connections").update(values as never).eq("id", id);
    if (error) throw new Error(error.message);
    return id;
  }
  const { data, error } = await supabaseAdmin
    .from("meta_connections")
    .insert({ singleton: true, page_id: "", page_name: "", ...values } as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/* --------------------------------------------------------------------- oauth */

/** Signed, time-bounded state so the popup callback can't be forged. */
export async function signState(): Promise<string> {
  const { appSecret } = metaAppConfig();
  const payload = `${Date.now()}`;
  const sig = await hmacHex(appSecret ?? "dev", payload);
  return `${payload}.${sig}`;
}

export async function verifyState(state: string): Promise<boolean> {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return false;
  if (Date.now() - Number(payload) > 15 * 60_000) return false;
  const { appSecret } = metaAppConfig();
  return timingSafeEqualHex(await hmacHex(appSecret ?? "dev", payload), sig);
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
      questions?: { key?: string; type?: string; label?: string }[];
    }[];
  }>(`${pageId}/leadgen_forms`, { access_token: pageToken, fields: "id,name,questions" });
  return res.data.map((f) => ({
    form_id: f.id,
    form_name: f.name,
    questions: (f.questions ?? []).map((q) => ({
      key: q.key ?? q.type ?? "",
      label: q.label ?? q.key ?? q.type ?? "",
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

/** Best-guess mapping so the clinic usually just confirms. */
export function autoMap(questions: { key: string; label: string }[]) {
  const map: Record<string, string> = {};
  for (const q of questions) {
    const k = `${q.key} ${q.label}`.toLowerCase();
    if (/full[_ ]?name|^name|your name/.test(k)) map[q.key] = "full_name";
    else if (/e-?mail/.test(k)) map[q.key] = "email";
    else if (/phone|mobile|whatsapp|contact number/.test(k)) map[q.key] = "phone";
    else if (/treatment|service|interest|procedure|concern/.test(k)) map[q.key] = "interest";
    else if (/city|location|area/.test(k)) map[q.key] = "city";
    else map[q.key] = "notes";
  }
  return map;
}

export async function saveForms(
  connectionId: string,
  forms: { form_id: string; form_name: string; questions: { key: string; label: string }[] }[],
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("meta_lead_forms")
    .select("form_id")
    .eq("connection_id", connectionId);
  const known = new Set((existing ?? []).map((f) => f.form_id));
  const fresh = forms.filter((f) => !known.has(f.form_id));
  if (fresh.length === 0) return;
  const { error } = await supabaseAdmin.from("meta_lead_forms").insert(
    fresh.map((f) => ({
      connection_id: connectionId,
      form_id: f.form_id,
      form_name: f.form_name,
      enabled: true,
      questions: f.questions,
      field_map: autoMap(f.questions),
    })),
  );
  if (error) throw new Error(error.message);
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
export async function insertLead(row: Record<string, unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("leads").insert(row as never);
  if (error && !error.message.includes("duplicate key")) throw new Error(error.message);
  return !error;
}

export async function captureLeadById(leadId: string, platform?: string) {
  const conn = await loadConnection();
  if (!conn?.page_access_token) throw new Error("No connected Facebook page");
  const lead = await fetchLead(leadId, conn.page_access_token);
  const forms = await loadForms(conn.id);
  const form = forms.find((f) => f.form_id === lead.form_id);
  if (form && !form.enabled) return false;
  const row = buildLeadRow(lead.field_data ?? [], form?.field_map ?? {}, {
    leadId: lead.id,
    formName: form?.form_name ?? "Lead ad",
    platform: platform ?? lead.platform,
    createdAt: lead.created_time,
  });
  const inserted = await insertLead(row);
  if (inserted) {
    await saveConnection({ last_lead_at: new Date().toISOString(), error_message: null }, conn.id);
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
    const row = buildLeadRow(lead.field_data ?? [], form.field_map ?? {}, {
      leadId: lead.id,
      formName: form.form_name,
      platform: lead.platform,
      createdAt: lead.created_time,
    });
    if (await insertLead(row)) count++;
  }
  return count;
}
