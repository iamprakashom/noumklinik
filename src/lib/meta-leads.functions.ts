import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }, action: string) {
  const { data: isAdmin, error } = await (context.supabase as never as {
    rpc: (n: string, a: Record<string, string>) => Promise<{ data: boolean; error: { message: string } | null }>;
  }).rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(`Could not verify your role: ${error.message}`);
  if (!isAdmin) throw new Error(`Only clinic admins can ${action}`);
}

/** Connection status + forms for the Lead capture settings tab. */
export const getLeadCaptureStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context, "view lead capture settings");
    const m = await import("@/lib/meta-leads.server");
    const conn = await m.loadConnection();
    const configured = m.metaAppConfig().configured;
    if (!conn) return { configured, connection: null, forms: [], recentLeads: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { count } = await supabaseAdmin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("source_group", "Meta Ads")
      .gte("created_at", since);

    const forms = await m.loadForms(conn.id);
    return {
      configured,
      connection: {
        id: conn.id,
        page_id: conn.page_id,
        page_name: conn.page_name,
        page_picture_url: conn.page_picture_url,
        status: conn.status,
        error_message: conn.error_message,
        last_lead_at: conn.last_lead_at,
      },
      forms: forms.map((f) => ({
        id: f.id,
        form_id: f.form_id,
        form_name: f.form_name,
        enabled: f.enabled,
        field_map: f.field_map ?? {},
        questions: f.questions ?? [],
      })),
      recentLeads: count ?? 0,
    };
  });

/** Returns the Facebook login URL the popup should open. */
export const startMetaConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context, "connect a Facebook page");
    const m = await import("@/lib/meta-leads.server");
    if (!m.metaAppConfig().configured) {
      throw new Error("Facebook app credentials are not configured yet.");
    }
    const redirectUri = `${data.origin}/api/public/hooks/meta-oauth-callback`;
    return { url: m.loginUrl(redirectUri, await m.signState()) };
  });

/** Pages the connected Facebook user manages. */
export const listMetaPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context, "view Facebook pages");
    const m = await import("@/lib/meta-leads.server");
    const conn = await m.loadConnection();
    if (!conn?.user_access_token) return [];
    const pages = await m.listPages(conn.user_access_token);
    return pages.map((p) => ({ id: p.id, name: p.name, picture: p.picture }));
  });

/** Picks a page: stores its token, subscribes webhooks, imports forms, backfills leads. */
export const selectMetaPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ pageId: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context, "connect a Facebook page");
    const m = await import("@/lib/meta-leads.server");
    const conn = await m.loadConnection();
    if (!conn?.user_access_token) throw new Error("Connect Facebook first.");

    const page = (await m.listPages(conn.user_access_token)).find((p) => p.id === data.pageId);
    if (!page) throw new Error("That page is no longer available.");

    await m.subscribePage(page.id, page.token);
    await m.saveConnection(
      {
        page_id: page.id,
        page_name: page.name,
        page_picture_url: page.picture,
        page_access_token: page.token,
        status: "connected",
        error_message: null,
      },
      conn.id,
    );

    const forms = await m.fetchForms(page.id, page.token);
    await m.saveForms(conn.id, forms);

    const stored = await m.loadForms(conn.id);
    const refreshed = await m.loadConnection();
    let imported = 0;
    if (refreshed) {
      for (const form of stored.filter((f) => f.enabled)) {
        try {
          imported += await m.backfillForm(refreshed, form);
        } catch {
          /* backfill is best-effort */
        }
      }
    }
    return { page: page.name, forms: stored.length, imported };
  });

/** Turns a form on/off and stores its question → CRM field mapping. */
export const saveFormSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        enabled: z.boolean(),
        field_map: z.record(z.string(), z.string()),
        confirmed_keys: z.array(z.string()).optional(),
        auto_apply: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context, "change lead capture settings");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const m = await import("@/lib/meta-leads.server");

    const { data: row } = await supabaseAdmin
      .from("meta_lead_forms")
      .select("questions, field_confidence, confirmed_keys")
      .eq("id", data.id)
      .maybeSingle();

    const questions = ((row?.questions as { key: string }[] | null) ?? []) as { key: string }[];
    const conf = (row?.field_confidence as { scores?: Record<string, number> } | null) ?? {};
    const scores = { ...(conf.scores ?? {}) };
    const previous = ((row?.confirmed_keys as string[] | null) ?? []) as string[];
    // Saving the form counts as confirming every field the user could see.
    const confirmed = Array.from(
      new Set([...previous, ...(data.confirmed_keys ?? questions.map((q) => q.key))]),
    );
    for (const k of confirmed) scores[k] = 1;

    const summary = m.reviewSummary(questions, scores, confirmed);
    const { error } = await supabaseAdmin
      .from("meta_lead_forms")
      .update({
        enabled: data.enabled,
        field_map: data.field_map,
        confirmed_keys: confirmed,
        field_confidence: { ...(conf as object), scores },
        needs_review: summary.needsReview,
        ...(data.auto_apply === undefined ? {} : { auto_apply: data.auto_apply }),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Re-reads forms from Facebook (new forms show up here). */
export const refreshMetaForms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context, "refresh lead forms");
    const m = await import("@/lib/meta-leads.server");
    const conn = await m.loadConnection();
    if (!conn?.page_access_token || !conn.page_id) throw new Error("Connect a page first.");
    const forms = await m.fetchForms(conn.page_id, conn.page_access_token);
    await m.saveForms(conn.id, forms);
    return { ok: true, count: forms.length };
  });

/** Creates a sample lead through the exact same mapping path. */
export const sendTestLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ formId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context, "send a test lead");
    const m = await import("@/lib/meta-leads.server");
    const conn = await m.loadConnection();
    if (!conn) throw new Error("Connect Facebook first.");
    const form = (await m.loadForms(conn.id)).find((f) => f.id === data.formId);
    if (!form) throw new Error("Form not found.");

    const sample = (form.questions ?? []).map((q) => ({
      name: q.key,
      values: [sampleValue(form.field_map?.[q.key] ?? "notes")],
    }));
    const row = m.buildLeadRow(sample.length ? sample : [{ name: "full_name", values: ["Test Lead"] }], form.field_map ?? {}, {
      leadId: `test-${Date.now()}`,
      formName: `${form.form_name} (test)`,
      platform: "fb",
    });
    await m.insertLead(row);
    return { ok: true };
  });

function sampleValue(target: string) {
  if (target === "full_name") return "Test Lead";
  if (target === "email") return "test.lead@example.com";
  if (target === "phone") return "+91 90000 00000";
  if (target === "interest") return "Laser Hair Removal";
  if (target === "city") return "Mumbai";
  return "Sample answer";
}

/** Removes the stored connection (leads already captured are kept). */
export const disconnectMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context, "disconnect Facebook");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const m = await import("@/lib/meta-leads.server");
    const conn = await m.loadConnection();
    if (conn) await supabaseAdmin.from("meta_connections").delete().eq("id", conn.id);
    return { ok: true };
  });

/** Advanced fallback: store a page token supplied by an agency. */
export const saveManualConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        pageId: z.string().min(1).max(100),
        pageName: z.string().min(1).max(200),
        pageToken: z.string().min(20).max(1000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context, "connect a Facebook page");
    const m = await import("@/lib/meta-leads.server");
    const conn = await m.loadConnection();
    const id = await m.saveConnection(
      {
        page_id: data.pageId,
        page_name: data.pageName,
        page_access_token: data.pageToken,
        status: "connected",
        error_message: null,
      },
      conn?.id,
    );
    try {
      await m.subscribePage(data.pageId, data.pageToken);
      const forms = await m.fetchForms(data.pageId, data.pageToken);
      await m.saveForms(id, forms);
    } catch (e) {
      await m.saveConnection({ error_message: (e as Error).message }, id);
      throw e;
    }
    return { ok: true };
  });
