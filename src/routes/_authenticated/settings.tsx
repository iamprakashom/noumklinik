import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/crm/AppShell";
import { STAGES } from "@/data/crm";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Amplify CRM" },
      {
        name: "description",
        content:
          "Configure workspace details, workflow stages and deadline alerting for your music marketing agency CRM.",
      },
      { property: "og:title", content: "Settings — Amplify CRM" },
      {
        property: "og:description",
        content: "Workspace, workflow stage and notification configuration.",
      },
    ],
  }),
  component: Settings,
});

function Settings() {
  return (
    <AppShell title="Settings" subtitle="Workspace configuration">
      <div className="max-w-2xl space-y-6">
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Workspace</h2>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Agency name</span>
              <input
                defaultValue="Amplify Music Marketing"
                className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Overdue alert threshold (days)
              </span>
              <input
                defaultValue="3"
                className="h-9 w-24 rounded-md border border-border bg-background px-3 text-sm tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Workflow stages</h2>
          <ol className="mt-4 divide-y divide-border">
            {STAGES.map((s, i) => (
              <li key={s} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-5 text-xs tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </AppShell>
  );
}