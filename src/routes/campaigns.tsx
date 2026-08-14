import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/crm/AppShell";
import { CampaignPanel } from "@/components/crm/CampaignPanel";
import { AvatarCircle, Chip, ProgressBar } from "@/components/crm/bits";
import { Button } from "@/components/ui/button";
import {
  CAMPAIGNS,
  CLIENTS,
  PEOPLE,
  STAGES,
  type Campaign,
  daysUntil,
  deadlineTone,
  formatDate,
  personById,
} from "@/data/crm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaign Board — Amplify CRM" },
      {
        name: "description",
        content:
          "Kanban board of every music marketing campaign from creation through reporting, filterable by project manager and client.",
      },
      { property: "og:title", content: "Campaign Board — Amplify CRM" },
      {
        property: "og:description",
        content: "Kanban board across eight workflow stages with deadlines and deliverable progress.",
      },
    ],
  }),
  component: Board,
});

function Board() {
  const [pm, setPm] = useState("all");
  const [client, setClient] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      CAMPAIGNS.filter(
        (c) => (pm === "all" || c.pm === pm) && (client === "all" || c.client === client),
      ),
    [pm, client],
  );

  const open = CAMPAIGNS.find((c) => c.id === openId) ?? null;
  const pms = PEOPLE.filter((p) => p.role === "PM");

  return (
    <AppShell
      title="Campaigns"
      subtitle={`${filtered.length} campaigns in flight`}
      actions={
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> New Campaign
        </Button>
      }
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Filter</span>
        <Select value={pm} onChange={setPm} options={[["all", "All PMs"], ...pms.map((p) => [p.id, p.name] as [string, string])]} />
        <Select
          value={client}
          onChange={setClient}
          options={[["all", "All clients"], ...CLIENTS.map((c) => [c, c] as [string, string])]}
        />
        {(pm !== "all" || client !== "all") && (
          <button
            onClick={() => {
              setPm("all");
              setClient("all");
            }}
            className="text-xs text-primary hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const cards = filtered.filter((c) => c.stage === stage);
          return (
            <div key={stage} className="flex w-64 shrink-0 flex-col">
              <div className="flex items-center justify-between px-1 pb-3">
                <span className="text-xs font-semibold">{stage}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {cards.length}
                </span>
              </div>
              <div className="flex flex-col gap-2 rounded-lg bg-secondary/50 p-2">
                {cards.map((c) => (
                  <CampaignCard key={c.id} campaign={c} onClick={() => setOpenId(c.id)} />
                ))}
                {cards.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                    Empty
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CampaignPanel campaign={open} onClose={() => setOpenId(null)} />
    </AppShell>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

function CampaignCard({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const done = campaign.deliverables.filter((d) => d.done).length;
  const tone = deadlineTone(campaign.deadline, campaign.stage);
  const days = daysUntil(campaign.deadline);

  return (
    <button
      onClick={onClick}
      className={cn(
        "card-hover w-full rounded-lg border border-border bg-card p-3 text-left",
      )}
    >
      <p className="text-xs text-muted-foreground">{campaign.client}</p>
      <p className="mt-0.5 truncate text-sm font-medium">{campaign.song}</p>
      <div className="mt-3 flex items-center gap-2">
        <AvatarCircle name={personById(campaign.pm).name} />
        <Chip tone={tone}>
          {tone === "overdue" ? `${Math.abs(days)}d late` : formatDate(campaign.deadline)}
        </Chip>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <ProgressBar
          value={(done / campaign.deliverables.length) * 100}
          tone={campaign.stage === "Completed" ? "completed" : "progress"}
        />
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {done}/{campaign.deliverables.length}
        </span>
      </div>
    </button>
  );
}