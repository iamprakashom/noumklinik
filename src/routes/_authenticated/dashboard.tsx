import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/crm/AppShell";
import { Chip, ProgressBar } from "@/components/crm/bits";
import { STAGES, daysUntil } from "@/data/crm";
import { useCrm } from "@/lib/crm-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Amplify Music Marketing CRM" },
      {
        name: "description",
        content:
          "Track campaign volume, workflow stage distribution and team throughput across every music marketing campaign.",
      },
      { property: "og:title", content: "Dashboard — Amplify Music Marketing CRM" },
      {
        property: "og:description",
        content: "Campaign stats and workflow stage distribution for your music marketing agency.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading, error } = useCrm();
  const campaigns = data?.campaigns ?? [];

  const total = campaigns.length;
  const completed = campaigns.filter((c) => c.stage === "Completed").length;
  const notStarted = campaigns.filter((c) => c.stage === "Created").length;
  const active = total - completed - notStarted;
  const overdue = campaigns.filter(
    (c) => c.stage !== "Completed" && daysUntil(c.deadline) < 0,
  ).length;
  const clientCount = new Set(campaigns.map((c) => c.client)).size;

  const counts = STAGES.map((s) => ({
    stage: s,
    count: campaigns.filter((c) => c.stage === s).length,
  }));

  const stats = [
    { label: "Total Campaigns", value: total, meta: `Across ${clientCount} clients` },
    { label: "Active", value: active, meta: `${notStarted} awaiting PM` },
    { label: "Completed", value: completed, meta: "All time" },
    { label: "Overdue", value: overdue, meta: "Past deadline" },
  ];

  const subtitle = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <AppShell title="Dashboard" subtitle={subtitle}>
      {error ? (
        <p className="text-sm text-status-overdue">Couldn't load campaigns. Try refreshing.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading campaigns…</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="card-hover rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.meta}</p>
              </div>
            ))}
          </div>

          <section className="mt-8 rounded-lg border border-border bg-card p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Campaigns by workflow stage</h2>
              <span className="text-xs text-muted-foreground">{total} campaigns</span>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-3">
              {counts.map((c) => (
                <Link
                  key={c.stage}
                  to="/campaigns"
                  search={{ stage: c.stage }}
                  className="card-hover flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 hover:border-primary"
                >
                  <span className="text-xs text-muted-foreground">{c.stage}</span>
                  <span className="ml-auto text-xs font-medium tabular-nums">{c.count}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8 rounded-lg border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold">Deadlines this week</h2>
            </div>
            <ul className="divide-y divide-border">
              {campaigns
                .filter((c) => c.stage !== "Completed" && daysUntil(c.deadline) < 5)
                .map((c) => {
                  const days = daysUntil(c.deadline);
                  const done = c.deliverables.filter((d) => d.done).length;
                  return (
                    <li key={c.id} className="flex items-center gap-4 px-6 py-3">
                      <div className="w-56 min-w-0">
                        <p className="truncate text-sm font-medium">{c.song}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.client}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{c.stage}</span>
                      <div className="ml-auto w-32">
                        <ProgressBar
                          value={
                            c.deliverables.length
                              ? (done / c.deliverables.length) * 100
                              : 0
                          }
                          tone={days < 0 ? "overdue" : "progress"}
                        />
                      </div>
                      <Chip tone={days < 0 ? "overdue" : days < 3 ? "progress" : "idle"}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : `in ${days}d`}
                      </Chip>
                    </li>
                  );
                })}
            </ul>
          </section>
        </>
      )}
    </AppShell>
  );
}
