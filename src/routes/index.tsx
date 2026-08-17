import { createFileRoute, Link } from "@tanstack/react-router";
import { Disc3 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Amplify — Music Marketing Campaign CRM" },
      {
        name: "description",
        content:
          "Amplify is the campaign operations CRM for music marketing agencies: workflow stages, deliverables, team workload and AI trend intelligence.",
      },
      { property: "og:title", content: "Amplify — Music Marketing Campaign CRM" },
      {
        property: "og:description",
        content: "Run every music marketing campaign from brief to reporting in one workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Disc3 className="size-5" />
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Amplify</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Campaign operations for music marketing agencies — stages, deliverables, team
          workload and trend intelligence in one place.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-secondary"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
