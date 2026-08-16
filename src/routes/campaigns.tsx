import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/crm/AppShell";
import { CampaignPanel } from "@/components/crm/CampaignPanel";
import { NewCampaignDialog } from "@/components/crm/NewCampaignDialog";
import { Chip, ProgressBar } from "@/components/crm/bits";
import { Button } from "@/components/ui/button";
import {
  CAMPAIGNS,
  PEOPLE,
  STAGES,
  type Campaign,
  type Stage,
  daysUntil,
  deadlineTone,
  formatDate,
} from "@/data/crm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/campaigns")({
  validateSearch: (search: Record<string, unknown>): { stage?: Stage } => {
    const s = search['stage'];
    return typeof s === "string" && (STAGES as readonly string[]).includes(s)
      ? { stage: s as Stage }
      : {};
  },
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
  const { stage: stageFilter } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>(CAMPAIGNS);
  const [pm, setPm] = useState("all");
  const [client, setClient] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [hidden, setHidden] = useState<Stage[]>([]);
  const [showStagePicker, setShowStagePicker] = useState(false);

  const clients = useMemo(
    () => Array.from(new Set(campaigns.map((c) => c.client))).sort(),
    [campaigns],
  );

  const filtered = useMemo(
    () =>
      campaigns.filter(
        (c) =>
          (pm === "all" || c.pm === pm) &&
          (client === "all" || c.client === client) &&
          (!stageFilter || c.stage === stageFilter),
      ),
    [campaigns, pm, client, stageFilter],
  );

  const visibleStages = stageFilter
    ? [stageFilter]
    : STAGES.filter((s) => !hidden.includes(s));

  function toggleStage(s: Stage) {
    setHidden((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  const open = campaigns.find((c) => c.id === openId) ?? null;
  const pms = PEOPLE.filter((p) => p.role === "PM");

  return (
    <AppShell
      title="Campaigns"
      subtitle={`${filtered.length} campaigns in flight`}
      actions={
        <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
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
          options={[["all", "All clients"], ...clients.map((c) => [c, c] as [string, string])]}
        />
        {stageFilter && (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
            Stage: {stageFilter}
            <button
              onClick={() => navigate({ search: {} })}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear stage filter"
            >
              ×
            </button>
          </span>
        )}
        {(pm !== "all" || client !== "all" || stageFilter) && (
          <button
            onClick={() => {
              setPm("all");
              setClient("all");
              navigate({ search: {} });
            }}
            className="text-xs text-primary hover:underline"
          >
            Clear
          </button>
        )}
        {!stageFilter && (
          <button
            onClick={() => setShowStagePicker((v) => !v)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <EyeOff className="size-3.5" />
            Stages
            {hidden.length > 0 && (
              <span className="tabular-nums text-muted-foreground">{hidden.length} hidden</span>
            )}
          </button>
        )}
      </div>

      {showStagePicker && !stageFilter && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
          {STAGES.map((s) => {
            const isHidden = hidden.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleStage(s)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
                  isHidden
                    ? "border-border text-muted-foreground hover:bg-accent"
                    : "border-primary/30 bg-primary/10 text-primary",
                )}
              >
                {isHidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {s}
              </button>
            );
          })}
          {hidden.length > 0 && (
            <button onClick={() => setHidden([])} className="text-xs text-primary hover:underline">
              Show all
            </button>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
        {visibleStages.map((stage) => {
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

      <CampaignPanel
        campaign={open}
        onClose={() => setOpenId(null)}
        onSave={(updated) =>
          setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        }
      />

      <NewCampaignDialog
        open={creating}
        onOpenChange={setCreating}
        onCreate={(c) => {
          setCampaigns((prev) => [c, ...prev]);
          setOpenId(c.id);
        }}
      />
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