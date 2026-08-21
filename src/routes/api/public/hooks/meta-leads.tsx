import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const leadSchema = z.object({
  full_name: z.string().min(1).max(200),
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  interest: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  external_id: z.string().max(200).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
});

export const Route = createFileRoute("/api/public/hooks/meta-leads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Meta webhook verification handshake
        const url = new URL(request.url);
        const token = process.env["META_VERIFY_TOKEN"];
        if (
          url.searchParams.get("hub.mode") === "subscribe" &&
          token &&
          url.searchParams.get("hub.verify_token") === token
        ) {
          return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        const secret = process.env["META_VERIFY_TOKEN"];
        if (secret && request.headers.get("x-verify-token") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const parsed = leadSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "Invalid payload" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("leads").insert({
          full_name: parsed.data.full_name,
          email: parsed.data.email ?? null,
          phone: parsed.data.phone ?? null,
          interest: parsed.data.interest ?? null,
          notes: parsed.data.notes ?? null,
          external_id: parsed.data.external_id ?? null,
          source: parsed.data.source ?? "Meta Lead Ads",
          stage: "New",
        });
        if (error) return Response.json({ error: "Could not store lead" }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
