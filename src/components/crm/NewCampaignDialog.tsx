import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Person } from "@/data/crm";
import type { NewCampaignInput } from "@/lib/crm-data";

export function NewCampaignDialog({
  open,
  people,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  people: Person[];
  onOpenChange: (v: boolean) => void;
  onCreate: (c: NewCampaignInput) => void;
}) {
  const pms = people.filter((p) => p.role === "PM");
  const executors = people.filter((p) => p.role === "Executor");

  const [client, setClient] = useState("");
  const [song, setSong] = useState("");
  const [pm, setPm] = useState(pms[0]?.id ?? "");
  const [executor, setExecutor] = useState(executors[0]?.id ?? "");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (!pm && pms[0]) setPm(pms[0].id);
    if (!executor && executors[0]) setExecutor(executors[0].id);
  }, [pm, executor, pms, executors]);

  const valid = client.trim() && song.trim() && deadline;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onCreate({
      client: client.trim(),
      song: song.trim(),
      pm: pm || (pms[0]?.id ?? ""),
      executor: executor || (executors[0]?.id ?? ""),
      deadline,
    });
    setClient("");
    setSong("");
    setDeadline("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>New campaign</DialogTitle>
          <DialogDescription>
            Add a campaign to the board. It starts with six standard deliverables.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="client">Client</Label>
            <Input id="client" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Neon Harbour" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="song">Campaign / song</Label>
            <Input id="song" value={song} onChange={(e) => setSong(e.target.value)} placeholder="Static Bloom" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="pm">Project manager</Label>
              <NativeSelect id="pm" value={pm} onChange={setPm} options={pms.map((p) => [p.id, p.name])} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="executor">Executor</Label>
              <NativeSelect
                id="executor"
                value={executor}
                onChange={setExecutor}
                options={executors.map((p) => [p.id, p.name])}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="deadline">Deadline</Label>
            <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!valid}>
              Create campaign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NativeSelect({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}
