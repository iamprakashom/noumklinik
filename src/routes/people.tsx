import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Pencil, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/crm/AppShell";
import { AvatarCircle, Chip } from "@/components/crm/bits";
import { InviteTeamDialog } from "@/components/crm/InviteTeamDialog";
import { Button } from "@/components/ui/button";
import { PEOPLE, type Person } from "@/data/crm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/people")({
  head: () => ({
    meta: [
      { title: "Team & Workload — Amplify CRM" },
      {
        name: "description",
        content:
          "Workload table for project managers, editors and executors with active campaigns and pending deliverables.",
      },
      { property: "og:title", content: "Team & Workload — Amplify CRM" },
      {
        property: "og:description",
        content: "Spot overloaded teammates at a glance across active campaigns and pending deliverables.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: People,
});

type Key = keyof Pick<Person, "name" | "role" | "activeCampaigns" | "deliverablesPending">;

const COLUMNS: { key: Key; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
  { key: "activeCampaigns", label: "Active Campaigns", numeric: true },
  { key: "deliverablesPending", label: "Deliverables Pending", numeric: true },
];

function People() {
  const [people, setPeople] = useState<Person[]>(PEOPLE);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftActive, setDraftActive] = useState(true);
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({
    key: "activeCampaigns",
    dir: -1,
  });

  const rows = [...people].sort((a, b) => {
    const x = a[sort.key];
    const y = b[sort.key];
    return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
  });

  const toggle = (key: Key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  function startEdit(p: Person) {
    setEditingId(p.id);
    setDraftActive(p.active);
  }

  function save(p: Person) {
    setPeople((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: draftActive } : x)));
    setEditingId(null);
    toast.success(`${p.name} ${draftActive ? "activated" : "deactivated"}`);
  }

  return (
    <AppShell
      title="Team"
      subtitle="Workload across the delivery team"
      actions={
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus className="size-4" />
          Invite team
        </Button>
      }
    >
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
                      (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                  </button>
                </th>
              ))}
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Edit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const overloaded = p.activeCampaigns > 5 && p.active;
              const editing = editingId === p.id;
              return (
                <tr
                  key={p.id}
                  className={cn(
                    "border-b border-border last:border-0",
                    overloaded ? "bg-status-progress-soft/60" : "hover:bg-secondary/60",
                    !p.active && "opacity-50",
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
                  <td className="px-4 py-3 text-right tabular-nums">{p.deliverablesPending}</td>
                  <td className="px-4 py-3">
                    {editing ? (
                      <div className="flex items-center gap-2">
                        <div className="flex rounded-md border border-border p-0.5">
                          <button
                            onClick={() => setDraftActive(true)}
                            className={cn(
                              "rounded px-2 py-0.5 text-xs",
                              draftActive ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                            )}
                          >
                            Active
                          </button>
                          <button
                            onClick={() => setDraftActive(false)}
                            className={cn(
                              "rounded px-2 py-0.5 text-xs",
                              !draftActive ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                            )}
                          >
                            Inactive
                          </button>
                        </div>
                        <Button size="sm" className="h-7 px-2 text-xs" onClick={() => save(p)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Chip tone={p.active ? "completed" : "idle"}>{p.active ? "Active" : "Inactive"}</Chip>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      aria-label={`Edit ${p.name}`}
                      onClick={() => (editing ? setEditingId(null) : startEdit(p))}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Rows tinted amber carry more than 5 active campaigns. Deactivated members are muted.
      </p>

      <InviteTeamDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={({ email, ...person }) => {
          setPeople((prev) => [...prev, person]);
          toast.success(`Invite sent to ${email}`);
        }}
      />
    </AppShell>
  );
}
