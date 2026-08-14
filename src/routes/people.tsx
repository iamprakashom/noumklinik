import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/crm/AppShell";
import { AvatarCircle, Chip } from "@/components/crm/bits";
import { PEOPLE, type Person, daysUntil, formatDate } from "@/data/crm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/people")({
  head: () => ({
    meta: [
      { title: "People & Workload — Amplify CRM" },
      {
        name: "description",
        content:
          "Workload table for project managers, editors and executors with active campaigns, pending deliverables and next deadlines.",
      },
      { property: "og:title", content: "People & Workload — Amplify CRM" },
      {
        property: "og:description",
        content: "Spot overloaded teammates at a glance across active campaigns and pending deliverables.",
      },
    ],
  }),
  component: People,
});

type Key = keyof Pick<
  Person,
  "name" | "role" | "activeCampaigns" | "deliverablesPending" | "upcomingDeadline"
>;

const COLUMNS: { key: Key; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
  { key: "activeCampaigns", label: "Active Campaigns", numeric: true },
  { key: "deliverablesPending", label: "Deliverables Pending", numeric: true },
  { key: "upcomingDeadline", label: "Upcoming Deadline" },
];

function People() {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({
    key: "activeCampaigns",
    dir: -1,
  });

  const rows = [...PEOPLE].sort((a, b) => {
    const x = a[sort.key];
    const y = b[sort.key];
    return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
  });

  const toggle = (key: Key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  return (
    <AppShell title="People" subtitle="Workload across the delivery team">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5 text-xs font-medium text-muted-foreground",
                    col.numeric ? "text-right" : "text-left",
                  )}
                >
                  <button
                    onClick={() => toggle(col.key)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-foreground",
                      sort.key === col.key && "text-foreground",
                    )}
                  >
                    {col.label}
                    {sort.key === col.key &&
                      (sort.dir === 1 ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      ))}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const overloaded = p.activeCampaigns > 5;
              const days = daysUntil(p.upcomingDeadline);
              return (
                <tr
                  key={p.id}
                  className={cn(
                    "border-b border-border last:border-0",
                    overloaded ? "bg-status-progress-soft/60" : "hover:bg-secondary/60",
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5">
                      <AvatarCircle name={p.name} />
                      <span className="font-medium">{p.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.role}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={cn(overloaded && "font-semibold text-status-progress")}>
                      {p.activeCampaigns}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.deliverablesPending}
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone={days < 0 ? "overdue" : days < 3 ? "progress" : "idle"}>
                      {formatDate(p.upcomingDeadline)}
                    </Chip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Rows tinted amber carry more than 5 active campaigns.
      </p>
    </AppShell>
  );
}