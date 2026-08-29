import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/hooks/cashfree")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get("x-webhook-signature") ?? "";
        const timestamp = request.headers.get("x-webhook-timestamp") ?? "";

        const { loadGatewayByProviderRef, settleLink } = await import("@/lib/payments.server");
        const early = JSON.parse(body || "{}") as { data?: { link_id?: string } };
        const linkRef = early.data?.link_id;
        // The link row identifies the clinic whose webhook secret must sign this call.
        const gateway = linkRef ? await loadGatewayByProviderRef(linkRef) : null;
        if (!gateway?.webhook_secret) {
          return new Response("Gateway not configured", { status: 503 });
        }

        const expected = createHmac("sha256", gateway.webhook_secret)
          .update(timestamp + body)
          .digest("base64");
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(body) as {
          type?: string;
          data?: {
            link_id?: string;
            link_amount_paid?: number;
            order?: { order_amount?: number };
            payment?: { payment_method?: string; payment_amount?: number };
          };
        };

        const ref = payload.data?.link_id;
        const amount =
          payload.data?.link_amount_paid ??
          payload.data?.payment?.payment_amount ??
          payload.data?.order?.order_amount ??
          0;
        const method = payload.data?.payment?.payment_method ?? "UPI";
        const paid = payload.type?.includes("PAID") || payload.type?.includes("SUCCESS");
        if (ref && paid) {
          await settleLink(ref, Number(amount), String(method).toUpperCase());
        }
        return Response.json({ ok: true });
      },
    },
  },
});
