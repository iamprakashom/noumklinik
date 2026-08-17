export const STAGES = [
  "Created",
  "PM Assigned",
  "Ideation",
  "Editing/Sampling",
  "Approval",
  "Execution",
  "Reporting",
  "Completed",
] as const;

export type Stage = (typeof STAGES)[number];

export type Person = {
  id: string;
  name: string;
  email?: string | null;
  role: "PM" | "Editor" | "Executor";
  active: boolean;
};

export type Deliverable = { id: string; label: string; done: boolean };

export type Campaign = {
  id: string;
  client: string;
  song: string;
  stage: Stage;
  pm: string;
  executor: string;
  deadline: string; // ISO date
  deliverables: Deliverable[];
};

export const DELIVERABLE_LABELS = [
  "Creative brief signed off",
  "Reference playlist curated",
  "30s edit master",
  "Vertical cutdowns (9:16)",
  "Creator seeding list",
  "Performance report",
];

function today() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

export function personById(people: Person[], id: string) {
  return people.find((p) => p.id === id);
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

export function daysUntil(iso: string) {
  return Math.round((new Date(iso + "T00:00:00Z").getTime() - today()) / 86_400_000);
}

export function deadlineTone(iso: string, stage: Stage) {
  if (stage === "Completed") return "idle" as const;
  const days = daysUntil(iso);
  if (days < 0) return "overdue" as const;
  if (days < 3) return "progress" as const;
  return "idle" as const;
}

export function formatDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatFullDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function activeCampaignCount(campaigns: Campaign[], personId: string) {
  return campaigns.filter(
    (c) => c.stage !== "Completed" && (c.pm === personId || c.executor === personId),
  ).length;
}

export function pendingDeliverableCount(campaigns: Campaign[], personId: string) {
  return campaigns
    .filter((c) => c.stage !== "Completed" && (c.pm === personId || c.executor === personId))
    .reduce((sum, c) => sum + c.deliverables.filter((d) => !d.done).length, 0);
}
