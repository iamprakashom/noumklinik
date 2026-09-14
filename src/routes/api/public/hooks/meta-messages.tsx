import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payload = z.object({
  entry: z.array(z.object({ id: z.string().optional(), messaging: z.array(z.unknown()).optional() })).optional(),
});

export const Route = createFileRoute("/api/public/hooks/meta-messages")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = process.env["META_VERIFY_TOKEN"];
        if (url.searchParams.get("hub.mode") === "subscribe" && token && url.searchParams.get("hub.verify_token") === token) {
          return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        const raw = await request.text();
        const meta = await import("@/lib/meta-leads.server");
        if (!(await meta.verifyWebhookSignature(request.headers.get("x-hub-signature-256"), raw))) {
          return new Response("Invalid signature", { status: 401 });
        }
        const parsed = payload.safeParse(JSON.parse(raw || "{}"));
        if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });
        const handler = await import("@/lib/meta-messaging.server");
        let received = 0;
        for (const entry of parsed.data.entry ?? []) {
          received += await handler.processMessagingEntry(entry as Parameters<typeof handler.processMessagingEntry>[0]);
        }
        return Response.json({ ok: true, received });
      },
    },
  },
});