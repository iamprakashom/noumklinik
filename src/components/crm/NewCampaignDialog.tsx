import { useState } from "react";
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
import { PEOPLE, STAGES, type Campaign, type Stage } from "@/data/crm";

const DELIVERABLE_LABELS = [
  "Creative brief signed off",
  "Reference playlist curated",
  "30s edit master",
  "Vertical cutdowns (9:16)",
  "Creator seeding list",
  "Performance report",
];

export function NewCampaignDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (c: Campaign) => void;
}) {
  const pms = PEOPLE.filter((p) => p.role === "PM");
  const executors = PEOPLE.filter((p) => p.role === "Executor");

  const [client, setClient] = useState("");
  const [song, setSong] = useState("");
  const [stage, setStage] = useState<Stage>("Created");
  const [pm, setPm] = useState(pms[0]?.id ?? "");
  const [executor, setExecutor] = useState(executors[0]?.id ?? "");
  const [deadline, setDeadline] = useState("");

  const valid = client.trim() && song.trim() && deadline;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onCreate({
      id: `c-${Date.now()}`,
      client: client.trim(),
      song: song.trim(),
      stage,
      pm,
      executor,
      deadline,
      deliverables: DELIVERABLE_LABELS.map((label) => ({
        id: label.toLowerCase().replace(/\W+/g, "-"),
        label,
        done: false,
      })),
    });
    setClient("");
    setSong("");
    setStage("Created");
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
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="stage">Stage</Label>
              <NativeSelect
                id="stage"
                value={stage}
                onChange={(v) => setStage(v as Stage)}
                options={STAGES.map((s) => [s, s])}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
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
