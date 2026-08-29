import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const notification = z.object({
  entry: z
    .array(
      z.object({
        id: z.string().optional(),
        changes: z
          .array(
            z.object({
              field: z.string().optional(),
              value: z
                .object({
                  leadgen_id: z.string().optional(),
                  form_id: z.string().optional(),
                  platform: z.string().optional(),
                })
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
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
        const raw = await request.text();
        const m = await import("@/lib/meta-leads.server");

        const valid = await m.verifyWebhookSignature(
          request.headers.get("x-hub-signature-256"),
          raw,
        );
        if (!valid) return new Response("Invalid signature", { status: 401 });

        const parsed = notification.safeParse(JSON.parse(raw || "{}"));
        if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

        let captured = 0;
        for (const entry of parsed.data.entry ?? []) {
          // entry.id is the Facebook page id, which resolves the owning clinic.
          const conn = entry.id ? await m.loadConnectionByPageId(entry.id) : null;
          if (!conn) continue;
          for (const change of entry.changes ?? []) {
            const leadId = change.value?.leadgen_id;
            if (!leadId) continue;
            try {
              if (await m.captureLeadById(conn, leadId, change.value?.platform)) captured++;
            } catch (e) {
              await m.saveConnection(
                conn.clinic_id,
                { error_message: (e as Error).message },
                conn.id,
              );
            }
          }
        }
        // Always 200 so Meta does not disable the subscription.
        return Response.json({ ok: true, captured });
      },
    },
  },
});
