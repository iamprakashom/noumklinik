import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payload = z.object({
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              value: z
                .object({
                  contacts: z
                    .array(
                      z.object({
                        wa_id: z.string().optional(),
                        profile: z.object({ name: z.string().optional() }).optional(),
                      }),
                    )
                    .optional(),
                  messages: z
                    .array(
                      z.object({
                        id: z.string(),
                        from: z.string(),
                        type: z.string().optional(),
                        text: z.object({ body: z.string().optional() }).optional(),
                      }),
                    )
                    .optional(),
                  statuses: z
                    .array(z.object({ id: z.string(), status: z.string() }))
                    .optional(),
                })
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

export const Route = createFileRoute("/api/public/hooks/whatsapp")({
  server: {
    handlers: {
      // Meta webhook verification handshake
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const { loadSettings } = await import("@/lib/whatsapp.server");
        const settings = await loadSettings();
        const expected = settings.verify_token;
        if (
          url.searchParams.get("hub.mode") === "subscribe" &&
          expected &&
          url.searchParams.get("hub.verify_token") === expected
        ) {
          return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        const raw = await request.text();
        const wa = await import("@/lib/whatsapp.server");

        const valid = await wa.verifySignature(request.headers.get("x-hub-signature-256"), raw);
        if (!valid) return new Response("Invalid signature", { status: 401 });

        const parsed = payload.safeParse(JSON.parse(raw || "{}"));
        if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

        const inbound: {
          from: string;
          text: string;
          type: string;
          id: string;
          name?: string;
        }[] = [];
        const statuses: { id: string; status: string }[] = [];

        for (const entry of parsed.data.entry ?? []) {
          for (const change of entry.changes ?? []) {
            const value = change.value;
            if (!value) continue;
            const name = value.contacts?.[0]?.profile?.name;
            for (const m of value.messages ?? []) {
              inbound.push({
                id: m.id,
                from: m.from,
                type: m.type ?? "text",
                text: m.text?.body ?? `[${m.type ?? "media"}]`,
                ...(name ? { name } : {}),
              });
            }
            for (const s of value.statuses ?? []) statuses.push(s);
          }
        }

        const received = await wa.recordInbound(inbound);
        const updated = await wa.recordStatuses(statuses);
        return Response.json({ received, updated });
      },
    },
  },
});
