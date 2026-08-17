import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/crm/AppShell";
import { CampaignPanel } from "@/components/crm/CampaignPanel";
import { NewCampaignDialog } from "@/components/crm/NewCampaignDialog";
import { Chip } from "@/components/crm/bits";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  STAGES,
  type Stage,
  deadlineTone,
  formatFullDate,
  personById,
} from "@/data/crm";
import { useCreateCampaign, useCrm, useSaveCampaign } from "@/lib/crm-data";

export const Route = createFileRoute("/_authenticated/campaigns")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { stage?: Stage } => {
    const s = search['stage'];
    return {
      ...(typeof s === "string" && (STAGES as readonly string[]).includes(s)
        ? { stage: s as Stage }
        : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Campaign Board — Amplify CRM" },
      {
        name: "description",
        content:
          "Sortable sheet of every music marketing campaign from creation through reporting, filterable by project manager and client.",
      },
      { property: "og:title", content: "Campaign Board — Amplify CRM" },
      {
        property: "og:description",
        content: "Campaign sheet across eight workflow stages with deadlines and deliverable progress.",
      },
    ],
  }),
  component: Board,
});

function Board() {
  const { stage: stageFilter } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, isLoading, error } = useCrm();
  const campaigns = data?.campaigns ?? [];
  const people = data?.people ?? [];
  const createCampaign = useCreateCampaign();
  const saveCampaign = useSaveCampaign();
  const [pm, setPm] = useState("all");
  const [client, setClient] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deadlineDir, setDeadlineDir] = useState<1 | -1>(1);

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

  const tableRows = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => (a.deadline > b.deadline ? 1 : a.deadline < b.deadline ? -1 : 0) * deadlineDir,
      ),
    [filtered, deadlineDir],
  );

  const open = campaigns.find((c) => c.id === openId) ?? null;
  const pms = people.filter((p) => p.role === "PM");

  return (
    <AppShell
      title="Campaigns"
      subtitle={`${filtered.length} campaigns in flight`}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New Campaign
          </Button>
        </div>
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
      </div>

      {error ? (
        <p className="mt-6 text-sm text-status-overdue">Couldn't load campaigns. Try refreshing.</p>
      ) : isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading campaigns…</p>
      ) : (
      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Project</th>
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">PM</th>
                <th className="px-4 py-2.5 font-medium">Stage</th>
                <th className="px-4 py-2.5 font-medium">
                  <button
                    onClick={() => setDeadlineDir((d) => (d === 1 ? -1 : 1))}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Deadline
                    {deadlineDir === 1 ? (
                      <ArrowUp className="size-3" />
                    ) : (
                      <ArrowDown className="size-3" />
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tableRows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setOpenId(c.id)}
                  className="cursor-pointer hover:bg-accent/50"
                >
                  <td className="px-4 py-2.5 font-medium">{c.song}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.client}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{personById(people, c.pm)?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{c.stage}</td>
                  <td className="px-4 py-2.5">
                    <Chip tone={deadlineTone(c.deadline, c.stage)}>{formatFullDate(c.deadline)}</Chip>
                  </td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-xs text-muted-foreground">
                    No campaigns match these filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>
      )}

      <CampaignPanel
        campaign={open}
        people={people}
        onClose={() => setOpenId(null)}
        onSave={(updated) =>
          saveCampaign.mutate(updated, {
            onError: () => toast.error("Couldn't save changes"),
          })
        }
      />

      <NewCampaignDialog
        open={creating}
        people={people}
        onOpenChange={setCreating}
        onCreate={(input) =>
          createCampaign.mutate(input, {
            onSuccess: (id) => {
              setOpenId(id);
              toast.success(`${input.song} added`);
            },
            onError: () => toast.error("Couldn't create campaign"),
          })
        }
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