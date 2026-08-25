import { createFileRoute } from "@tanstack/react-router";

function closingPage(message: string, ok: boolean) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Facebook</title>
<body style="font-family:system-ui;padding:32px;text-align:center">
<p>${message}</p>
<script>
  try { window.opener && window.opener.postMessage({ source: "meta-connect", ok: ${ok} }, "*"); } catch (e) {}
  setTimeout(function(){ window.close(); }, 600);
</script></body>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/hooks/meta-oauth-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!code || !state) return closingPage("Facebook sign-in was cancelled.", false);

        const m = await import("@/lib/meta-leads.server");
        if (!(await m.verifyState(state))) {
          return closingPage("This sign-in link expired. Please try again.", false);
        }

        try {
          const redirectUri = `${url.origin}/api/public/hooks/meta-oauth-callback`;
          const userToken = await m.exchangeCodeForUserToken(code, redirectUri);
          const existing = await m.loadConnection();
          await m.saveConnection(
            { user_access_token: userToken, status: "choose_page", error_message: null },
            existing?.id,
          );
          return closingPage("Connected. You can close this window.", true);
        } catch (e) {
          return closingPage(`Could not connect: ${(e as Error).message}`, false);
        }
      },
    },
  },
});
