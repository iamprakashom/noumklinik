import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/crm/AppShell";
import { Chip, ProgressBar } from "@/components/crm/bits";
import { CAMPAIGNS, STAGES, daysUntil } from "@/data/crm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
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
    ],
  }),
  component: Dashboard,
});

const STAGE_FILL = [
  "bg-status-idle/40",
  "bg-status-idle/60",
  "bg-primary/30",
  "bg-primary/50",
  "bg-primary/70",
  "bg-primary",
  "bg-status-progress",
  "bg-status-completed",
];

function Dashboard() {
  const total = CAMPAIGNS.length;
  const completed = CAMPAIGNS.filter((c) => c.stage === "Completed").length;
  const notStarted = CAMPAIGNS.filter((c) => c.stage === "Created").length;
  const active = total - completed - notStarted;
  const overdue = CAMPAIGNS.filter(
    (c) => c.stage !== "Completed" && daysUntil(c.deadline) < 0,
  ).length;

  const counts = STAGES.map((s) => ({
    stage: s,
    count: CAMPAIGNS.filter((c) => c.stage === s).length,
  }));

  const stats = [
    { label: "Total Campaigns", value: total, meta: "Across 6 clients" },
    { label: "Active", value: active, meta: `${overdue} overdue` },
    { label: "Completed", value: completed, meta: "Last 30 days" },
    { label: "Pending", value: notStarted, meta: "Awaiting PM assignment" },
  ];

  return (
    <AppShell title="Dashboard" subtitle="Friday, August 14 2026">
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="card-hover rounded-lg border border-border bg-card p-4"
          >
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
              {s.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{s.meta}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-lg border border-border bg-card p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Campaigns by workflow stage</h2>
          <span className="text-xs text-muted-foreground">{total} campaigns</span>
        </div>

        <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-secondary">
          {counts.map((c, i) => (
            <div
              key={c.stage}
              className={cn(STAGE_FILL[i], "h-full")}
              style={{ width: `${(c.count / total) * 100}%` }}
              title={`${c.stage}: ${c.count}`}
            />
          ))}
        </div>

        <div className="mt-5 grid grid-cols-4 gap-x-8 gap-y-3">
          {counts.map((c, i) => (
            <div key={c.stage} className="flex items-center gap-2">
              <span className={cn("size-2 rounded-sm", STAGE_FILL[i])} />
              <span className="text-xs text-muted-foreground">{c.stage}</span>
              <span className="ml-auto text-xs font-medium tabular-nums">{c.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">Deadlines this week</h2>
        </div>
        <ul className="divide-y divide-border">
          {CAMPAIGNS.filter(
            (c) => c.stage !== "Completed" && daysUntil(c.deadline) < 5,
          ).map((c) => {
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
                    value={(done / c.deliverables.length) * 100}
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
    </AppShell>
  );
}
