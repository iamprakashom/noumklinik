import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireClinicId } from "@/lib/clinic.server";

type RoleCtx = {
  supabase: {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "admin" | "provider" | "front_desk" },
    ) => PromiseLike<{ data: boolean | null; error: { message: string } | null }>;
  };
  userId: string;
};

async function assertAdmin(context: RoleCtx, action: string) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(`Could not verify your role: ${error.message}`);
  if (!data) throw new Error(`Only clinic admins can ${action}`);
}

const metaChannel = z.enum(["messenger", "instagram"]);

/** Status of all three inbox channels for Settings → Messaging. */
export const getMessagingChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context, "view messaging settings");
    const clinicId = await requireClinicId(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const m = await import("@/lib/meta-leads.server");

    const { data: wa } = await supabaseAdmin
      .from("whatsapp_settings")
      .select("display_name, phone_number, enabled, status, error_message")
      .eq("clinic_id", clinicId)
      .maybeSingle();

    const { data: meta } = await supabaseAdmin
      .from("meta_connections")
      .select(
        "page_id, page_name, page_picture_url, instagram_account_id, instagram_username, instagram_picture_url, messenger_enabled, instagram_enabled, messaging_status, messaging_error, messaging_connected_at",
      )
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: conversations } = await supabaseAdmin
      .from("inbox_conversations")
      .select("channel, unread_count")
      .eq("clinic_id", clinicId);

    const unread: Record<string, number> = { whatsapp: 0, messenger: 0, instagram: 0 };
    for (const c of conversations ?? []) {
      unread[c.channel] = (unread[c.channel] ?? 0) + (c.unread_count ?? 0);
    }

    return {
      configured: m.metaAppConfig().configured,
      whatsapp: {
        display_name: wa?.display_name ?? null,
        phone_number: wa?.phone_number ?? null,
        enabled: wa?.enabled ?? false,
        status: wa?.status ?? "Not connected",
        error_message: wa?.error_message ?? null,
        unread: unread["whatsapp"] ?? 0,
      },
      meta: {
        page_id: meta?.page_id ?? null,
        page_name: meta?.page_name ?? null,
        page_picture_url: meta?.page_picture_url ?? null,
        instagram_account_id: meta?.instagram_account_id ?? null,
        instagram_username: meta?.instagram_username ?? null,
        instagram_picture_url: meta?.instagram_picture_url ?? null,
        messenger_enabled: meta?.messenger_enabled ?? false,
        instagram_enabled: meta?.instagram_enabled ?? false,
        messaging_status: meta?.messaging_status ?? "not_connected",
        messaging_error: meta?.messaging_error ?? null,
        messaging_connected_at: meta?.messaging_connected_at ?? null,
        messenger_unread: unread["messenger"] ?? 0,
        instagram_unread: unread["instagram"] ?? 0,
      },
    };
  });

/** Turns on Messenger (and linked Instagram) messaging for the connected page. */
export const connectMessaging = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context, "connect messaging channels");
    const clinicId = await requireClinicId(context.supabase);
    const m = await import("@/lib/meta-leads.server");
    const conn = await m.loadConnection(clinicId);
    if (!conn?.page_id || !conn.page_access_token) {
      throw new Error("Connect your Facebook page first in Settings → Lead capture.");
    }

    const { subscribeMessaging, fetchInstagramAccount } = await import(
      "@/lib/messaging-channels.server"
    );
    const { upsertConnection } = await import("@/lib/inbox.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      await subscribeMessaging(conn.page_id, conn.page_access_token);
    } catch (e) {
      await supabaseAdmin
        .from("meta_connections")
        .update({ messaging_status: "error", messaging_error: (e as Error).message })
        .eq("id", conn.id);
      throw e;
    }

    const ig = await fetchInstagramAccount(conn.page_id, conn.page_access_token);

    await supabaseAdmin
      .from("meta_connections")
      .update({
        messenger_enabled: true,
        instagram_enabled: Boolean(ig?.id),
        instagram_account_id: ig?.id ?? null,
        instagram_username: ig?.username ?? null,
        instagram_picture_url: ig?.picture ?? null,
        messaging_status: "connected",
        messaging_error: null,
        messaging_connected_at: new Date().toISOString(),
      })
      .eq("id", conn.id);

    await upsertConnection({
      clinicId,
      channel: "messenger",
      providerAccountId: conn.page_id,
      displayName: conn.page_name,
      pictureUrl: conn.page_picture_url,
      status: "connected",
      enabled: true,
    });
    if (ig?.id) {
      await upsertConnection({
        clinicId,
        channel: "instagram",
        providerAccountId: ig.id,
        providerParentId: conn.page_id,
        displayName: ig.username,
        username: ig.username,
        pictureUrl: ig.picture,
        status: "connected",
        enabled: true,
      });
    }

    return { page: conn.page_name, instagram: ig?.username ?? null };
  });

/** Pauses or resumes a single Meta channel without disconnecting the page. */
export const setMessagingChannelEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ channel: metaChannel, enabled: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context, "change messaging channels");
    const clinicId = await requireClinicId(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const m = await import("@/lib/meta-leads.server");
    const conn = await m.loadConnection(clinicId);
    if (!conn) throw new Error("No Facebook page is connected yet.");
    if (data.channel === "instagram" && data.enabled && !conn.page_id) {
      throw new Error("Connect your Facebook page first.");
    }

    await supabaseAdmin
      .from("meta_connections")
      .update(
        data.channel === "messenger"
          ? { messenger_enabled: data.enabled }
          : { instagram_enabled: data.enabled },
      )
      .eq("id", conn.id);

    await supabaseAdmin
      .from("inbox_connections")
      .update({ enabled: data.enabled })
      .eq("clinic_id", clinicId)
      .eq("channel", data.channel);

    return { ok: true };
  });

/** Stops Messenger and Instagram messaging; lead capture and history stay intact. */
export const disconnectMessaging = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context, "disconnect messaging channels");
    const clinicId = await requireClinicId(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const m = await import("@/lib/meta-leads.server");
    const conn = await m.loadConnection(clinicId);
    if (conn) {
      await supabaseAdmin
        .from("meta_connections")
        .update({
          messenger_enabled: false,
          instagram_enabled: false,
          messaging_status: "not_connected",
          messaging_error: null,
        })
        .eq("id", conn.id);
    }
    await supabaseAdmin
      .from("inbox_connections")
      .update({ enabled: false, status: "disconnected" })
      .eq("clinic_id", clinicId)
      .in("channel", ["messenger", "instagram"]);
    return { ok: true };
  });
