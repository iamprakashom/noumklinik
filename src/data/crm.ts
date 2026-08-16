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
  role: "PM" | "Editor" | "Executor";
  activeCampaigns: number;
  deliverablesPending: number;
  upcomingDeadline: string;
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
  deadline: string; // ISO
  deliverables: Deliverable[];
};

export const PEOPLE: Person[] = [
  { id: "p1", name: "Aditi Rao", role: "PM", activeCampaigns: 7, deliverablesPending: 12, upcomingDeadline: "2026-08-18", active: true },
  { id: "p2", name: "Marcus Bell", role: "PM", activeCampaigns: 4, deliverablesPending: 5, upcomingDeadline: "2026-08-16", active: true },
  { id: "p3", name: "Nina Kovač", role: "Editor", activeCampaigns: 6, deliverablesPending: 9, upcomingDeadline: "2026-08-15", active: true },
  { id: "p4", name: "Yuki Tanaka", role: "Editor", activeCampaigns: 3, deliverablesPending: 2, upcomingDeadline: "2026-08-22", active: false },
  { id: "p5", name: "Diego Alvarez", role: "Executor", activeCampaigns: 5, deliverablesPending: 6, upcomingDeadline: "2026-08-19", active: true },
  { id: "p6", name: "Sara Lindqvist", role: "Executor", activeCampaigns: 8, deliverablesPending: 14, upcomingDeadline: "2026-08-14", active: true },
  { id: "p7", name: "Tom Okafor", role: "PM", activeCampaigns: 2, deliverablesPending: 1, upcomingDeadline: "2026-08-27", active: true },
  { id: "p8", name: "Elena Rossi", role: "Editor", activeCampaigns: 5, deliverablesPending: 4, upcomingDeadline: "2026-08-20", active: true },
];

const d = (label: string, done: boolean): Deliverable => ({
  id: label.toLowerCase().replace(/\W+/g, "-"),
  label,
  done,
});

function set(done: number): Deliverable[] {
  const labels = [
    "Creative brief signed off",
    "Reference playlist curated",
    "30s edit master",
    "Vertical cutdowns (9:16)",
    "Creator seeding list",
    "Performance report",
  ];
  return labels.map((l, i) => d(l, i < done));
}

export const CAMPAIGNS: Campaign[] = [
  { id: "c1", client: "Neon Harbour", song: "Static Bloom", stage: "Created", pm: "p1", executor: "p5", deadline: "2026-09-04", deliverables: set(0) },
  { id: "c2", client: "Wrenfield Records", song: "Paper Cities", stage: "Created", pm: "p2", executor: "p6", deadline: "2026-08-16", deliverables: set(1) },
  { id: "c3", client: "Halcyon Group", song: "Low Tide", stage: "PM Assigned", pm: "p1", executor: "p5", deadline: "2026-08-13", deliverables: set(1) },
  { id: "c4", client: "Ivory Tape", song: "Midnight Ration", stage: "PM Assigned", pm: "p7", executor: "p6", deadline: "2026-09-11", deliverables: set(1) },
  { id: "c5", client: "Beacon Sound", song: "Ghostwriter", stage: "Ideation", pm: "p2", executor: "p5", deadline: "2026-08-15", deliverables: set(2) },
  { id: "c6", client: "Neon Harbour", song: "Cassette Sun", stage: "Ideation", pm: "p1", executor: "p6", deadline: "2026-09-01", deliverables: set(2) },
  { id: "c7", client: "Marrow Music", song: "Tin Roof", stage: "Editing/Sampling", pm: "p1", executor: "p5", deadline: "2026-08-12", deliverables: set(3) },
  { id: "c8", client: "Wrenfield Records", song: "Slow Freight", stage: "Editing/Sampling", pm: "p7", executor: "p6", deadline: "2026-08-24", deliverables: set(3) },
  { id: "c9", client: "Halcyon Group", song: "Vermilion", stage: "Approval", pm: "p2", executor: "p5", deadline: "2026-08-16", deliverables: set(4) },
  { id: "c10", client: "Ivory Tape", song: "Held Breath", stage: "Approval", pm: "p1", executor: "p6", deadline: "2026-08-11", deliverables: set(4) },
  { id: "c11", client: "Beacon Sound", song: "Radio Silence", stage: "Execution", pm: "p1", executor: "p5", deadline: "2026-08-28", deliverables: set(4) },
  { id: "c12", client: "Marrow Music", song: "Copper Wire", stage: "Execution", pm: "p2", executor: "p6", deadline: "2026-08-17", deliverables: set(5) },
  { id: "c13", client: "Neon Harbour", song: "Afterglow", stage: "Reporting", pm: "p7", executor: "p5", deadline: "2026-08-21", deliverables: set(5) },
  { id: "c14", client: "Wrenfield Records", song: "Salt & Static", stage: "Completed", pm: "p1", executor: "p6", deadline: "2026-08-02", deliverables: set(6) },
  { id: "c15", client: "Halcyon Group", song: "Blue Hour", stage: "Completed", pm: "p2", executor: "p5", deadline: "2026-07-29", deliverables: set(6) },
  { id: "c16", client: "Ivory Tape", song: "Dust Choir", stage: "Completed", pm: "p7", executor: "p6", deadline: "2026-07-22", deliverables: set(6) },
];

export const TODAY = new Date("2026-08-14T00:00:00Z");

export function personById(id: string) {
  return PEOPLE.find((p) => p.id === id)!;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

export function daysUntil(iso: string) {
  return Math.round(
    (new Date(iso + "T00:00:00Z").getTime() - TODAY.getTime()) / 86_400_000,
  );
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

export const CLIENTS = Array.from(new Set(CAMPAIGNS.map((c) => c.client))).sort();