import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { acceptInvite } from "@/lib/team.functions";

export const Route = createFileRoute("/join")({
  ssr: false,
  validateSearch: z.object({ token: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Join a clinic — Noum Klinik" },
      {
        name: "description",
        content: "Accept your colleague's invitation and join the clinic workspace on Noum Klinik.",
      },
      { property: "og:title", content: "Join a clinic — Noum Klinik" },
      { property: "og:description", content: "Accept an invitation to a clinic workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const accept = useServerFn(acceptInvite);
  const [state, setState] = useState<"working" | "error">("working");
  const [message, setMessage] = useState("Checking your invitation…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      if (!token) {
        setState("error");
        setMessage("This invitation link is incomplete.");
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        sessionStorage.setItem("pending_invite_token", token);
        navigate({ to: "/auth", replace: true });
        return;
      }
      try {
        await accept({ data: { token } });
        sessionStorage.removeItem("pending_invite_token");
        navigate({ to: "/dashboard", replace: true });
      } catch (err) {
        setState("error");
        setMessage(err instanceof Error ? err.message : "Could not accept this invitation.");
      }
    })();
  }, [token, accept, navigate]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto mb-4 flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Stethoscope className="size-5" />
        </span>
        <h1 className="text-base font-semibold tracking-tight">Join your clinic</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {state === "error" ? (
          <Button className="mt-4" onClick={() => navigate({ to: "/auth" })}>
            Go to sign in
          </Button>
        ) : null}
      </div>
    </main>
  );
}
