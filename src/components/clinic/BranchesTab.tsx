import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Chip, EmptyState, Field, Panel, inputClass } from "@/components/clinic/bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createBranch, listBranches, setBranchActive } from "@/lib/branches.functions";

export function BranchesTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const load = useServerFn(listBranches);
  const add = useServerFn(createBranch);
  const setActive = useServerFn(setBranchActive);
  const branches = useQuery({ queryKey: ["branches"], queryFn: () => load() });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["branches"] });
  const create = useMutation({
    mutationFn: (values: { name: string; code: string }) => add({ data: values }),
    onSuccess: () => {
      setOpen(false);
      refresh();
      toast.success("Branch created");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const status = useMutation({
    mutationFn: (values: { clinicId: string; active: boolean }) => setActive({ data: values }),
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Panel
      title={branches.data?.organizationName ?? "Branches"}
      action={branches.data?.isOwner ? (
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="size-3.5" /> Add branch</Button>
      ) : null}
    >
      <p className="mb-4 text-xs text-muted-foreground">Each branch keeps its own appointments, billing identity, day close, rooms, and integrations.</p>
      {branches.data?.branches.length === 0 ? <EmptyState>No branches found.</EmptyState> : (
        <ul className="divide-y divide-border">
          {branches.data?.branches.map((branch) => (
            <li key={branch.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex size-8 items-center justify-center rounded-md bg-secondary"><Building2 className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{branch.name}</p>
                <p className="text-xs text-muted-foreground">{branch.branch_code || "No branch code"}</p>
              </div>
              <Chip tone={branch.active ? "completed" : "idle"}>{branch.active ? "Active" : "Archived"}</Chip>
              {branches.data?.isOwner ? (
                <Button variant="outline" size="sm" disabled={status.isPending} onClick={() => status.mutate({ clinicId: branch.id, active: !branch.active })}>
                  {branch.active ? "Archive" : "Restore"}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add branch</DialogTitle></DialogHeader>
          <form id="branch-form" className="grid gap-4" onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            create.mutate({ name: String(form.get("name") ?? ""), code: String(form.get("code") ?? "") });
          }}>
            <Field label="Branch name"><input name="name" required minLength={2} className={inputClass} placeholder="Indiranagar" /></Field>
            <Field label="Branch code"><input name="code" maxLength={20} className={inputClass} placeholder="IND" /></Field>
          </form>
          <DialogFooter>
            <button type="button" className={ghostButton} onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" form="branch-form" className={primaryButton} disabled={create.isPending}>{create.isPending ? "Creating…" : "Create branch"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}