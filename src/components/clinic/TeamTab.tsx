import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Chip, EmptyState, Field, Panel, inputClass } from "@/components/clinic/bits";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getTeam,
  inviteTeamMember,
  removeTeamMember,
  revokeInvite,
  updateTeamMember,
} from "@/lib/team.functions";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "provider", label: "Provider" },
  { value: "front_desk", label: "Front desk" },
] as const;

export function TeamTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const loadTeam = useServerFn(getTeam);
  const team = useQuery({ queryKey: ["team"], queryFn: () => loadTeam() });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["team"] });

  const inviteFn = useServerFn(inviteTeamMember);
  const revokeFn = useServerFn(revokeInvite);
  const updateFn = useServerFn(updateTeamMember);
  const removeFn = useServerFn(removeTeamMember);

  const fail = (e: Error) => toast.error(e.message);

  const invite = useMutation({
    mutationFn: (values: { email: string; role: string }) =>
      inviteFn({
        data: { email: values.email, role: values.role as "admin", origin: window.location.origin },
      }),
    onSuccess: (res) => {
      setLink(res.link);
      setOpen(false);
      refresh();
      toast.success("Invite created — share the link with your colleague");
    },
    onError: fail,
  });

  const update = useMutation({
    mutationFn: (values: { id: string; role?: string; status?: string }) =>
      updateFn({ data: values as { id: string } }),
    onSuccess: () => {
      refresh();
      toast.success("Team access updated");
    },
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      refresh();
      toast.success("Colleague removed");
    },
    onError: fail,
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => {
      refresh();
      toast.success("Invite revoked");
    },
    onError: fail,
  });

  const members = team.data?.members ?? [];
  const invites = team.data?.invites ?? [];
  const myMember = members.find((m) => m.user_id === team.data?.me);
  const isAdmin = myMember?.role === "admin" && myMember?.status === "active";

  return (
    <div className="space-y-4">
      <Panel
        title="Team"
        action={
          isAdmin ? (
            <button className={primaryButton} onClick={() => setOpen(true)}>
              <Plus className="size-3.5" /> Invite colleague
            </button>
          ) : null
        }
      >
        {members.length === 0 ? (
          <EmptyState>No colleagues yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {m.full_name || m.email || "Colleague"}
                    {m.user_id === team.data?.me ? <span className="text-muted-foreground"> · you</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.email ?? "—"}</p>
                </div>
                {m.status !== "active" ? <Chip tone="overdue">Suspended</Chip> : null}
                {isAdmin ? (
                  <>
                    <select
                      className={`${inputClass} w-36`}
                      value={m.role}
                      aria-label={`Role for ${m.email ?? "colleague"}`}
                      onChange={(e) => update.mutate({ id: m.id, role: e.target.value })}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className={ghostButton}
                      onClick={() =>
                        update.mutate({ id: m.id, status: m.status === "active" ? "suspended" : "active" })
                      }
                    >
                      {m.status === "active" ? "Suspend" : "Reactivate"}
                    </button>
                    {m.user_id === team.data?.me ? null : (
                      <button
                        className={ghostButton}
                        aria-label={`Remove ${m.email ?? "colleague"}`}
                        onClick={() => remove.mutate(m.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-xs font-medium capitalize text-muted-foreground">
                    {m.role.replace("_", " ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Pending invites">
        {invites.length === 0 ? (
          <EmptyState>No pending invites.</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{i.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.role.replace("_", " ")} · expires {new Date(i.expires_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                {isAdmin ? (
                  <button className={ghostButton} onClick={() => revoke.mutate(i.id)}>
                    Revoke
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {link ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">Invite link</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Share this with your colleague. It only works for the invited email address.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input readOnly value={link} className={inputClass} aria-label="Invite link" />
            <button
              className={ghostButton}
              onClick={() => {
                void navigator.clipboard.writeText(link);
                toast.success("Link copied");
              }}
            >
              <Copy className="size-3.5" /> Copy
            </button>
          </div>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a colleague</DialogTitle>
          </DialogHeader>
          <form
            id="invite-form"
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              invite.mutate({ email: String(fd.get("email")), role: String(fd.get("role")) });
            }}
          >
            <Field label="Work email">
              <input name="email" type="email" required className={inputClass} />
            </Field>
            <Field label="Role">
              <select name="role" defaultValue="front_desk" className={inputClass}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          </form>
          <DialogFooter>
            <button type="button" className={ghostButton} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="invite-form" className={primaryButton} disabled={invite.isPending}>
              Create invite
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
