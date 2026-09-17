import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { AppShell, primaryButton } from "@/components/clinic/AppShell";

export const Route = createFileRoute("/_authenticated/access-denied")({
  head: () => ({ meta: [
    { title: "Access restricted — Noum Klinik" },
    { name: "description", content: "This clinic area is restricted for your role." },
    { property: "og:title", content: "Access restricted — Noum Klinik" },
    { property: "og:description", content: "This clinic area is restricted for your role." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AccessDenied,
});

function AccessDenied() {
  return <AppShell title="Access restricted">
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <ShieldAlert className="size-10 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-semibold">This area is not available for your role</h2>
      <p className="mt-2 text-sm text-muted-foreground">Ask a clinic admin if your responsibilities have changed.</p>
      <Link to="/dashboard" className={`${primaryButton} mt-6`}>Return to today</Link>
    </div>
  </AppShell>;
}