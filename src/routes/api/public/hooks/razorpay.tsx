import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/hooks/razorpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get("x-razorpay-signature") ?? "";

        const { loadGateway, settleLink } = await import("@/lib/payments.server");
        const gateway = await loadGateway();
        if (!gateway?.webhook_secret) {
          return new Response("Gateway not configured", { status: 503 });
        }

        const expected = createHmac("sha256", gateway.webhook_secret).update(body).digest("hex");
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(body) as {
          event?: string;
          payload?: {
            payment_link?: { entity?: { id?: string; amount?: number } };
            payment?: { entity?: { method?: string; amount?: number } };
          };
        };
        if (payload.event !== "payment_link.paid") return Response.json({ ok: true });

        const ref = payload.payload?.payment_link?.entity?.id;
        const amount = (payload.payload?.payment_link?.entity?.amount ?? 0) / 100;
        const method = payload.payload?.payment?.entity?.method ?? "UPI";
        if (ref) await settleLink(ref, amount, method.toUpperCase());
        return Response.json({ ok: true });
      },
    },
  },
});
