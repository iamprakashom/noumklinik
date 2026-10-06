import {
  CalendarCheck,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Image as ImageIcon,
  Instagram,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------- shared bits ---------------- */

const sourceMeta = {
  whatsapp: { icon: MessageCircle, label: "WhatsApp" },
  instagram: { icon: Instagram, label: "Instagram" },
  call: { icon: Phone, label: "Call" },
} as const;

type Source = keyof typeof sourceMeta;

function SourceChip({ source }: { source: Source }) {
  const { icon: Icon, label } = sourceMeta[source];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
      <Icon className="size-3" />
      {label}
    </span>
  );
}

function StageChip({ stage, tone = "soft" }: { stage: string; tone?: "soft" | "solid" | "warn" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tone === "solid" && "bg-primary text-primary-foreground",
        tone === "soft" && "bg-primary-soft text-primary-dark",
        tone === "warn" && "bg-destructive/10 text-destructive",
      )}
    >
      {stage}
    </span>
  );
}

export const pipelineStages = [
  "Consult Booked",
  "Consult Done",
  "Plan Proposed",
  "Package Sold",
  "Sessions Tracked",
];

export function PipelineStrip({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {pipelineStages.map((stage, i) => (
        <div key={stage} className="flex items-center gap-1.5">
          <span
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap",
              i <= 2
                ? "border-primary/25 bg-primary-soft text-primary-dark"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {stage}
          </span>
          {i < pipelineStages.length - 1 && <ChevronRight className="size-3 text-muted-foreground/60" />}
        </div>
      ))}
    </div>
  );
}

/* ---------------- leads ---------------- */

type Lead = {
  name: string;
  source: Source;
  interest: string;
  stage: string;
  tone?: "soft" | "solid" | "warn";
  followUp: string;
  urgent?: boolean;
  initials: string;
};

const leads: Lead[] = [
  {
    name: "Ananya Mehra",
    initials: "AM",
    source: "whatsapp",
    interest: "Botox — forehead lines",
    stage: "Consult Booked",
    tone: "solid",
    followUp: "Reminder in 24h",
    urgent: true,
  },
  {
    name: "Rhea Kapoor",
    initials: "RK",
    source: "instagram",
    interest: "Laser hair reduction",
    stage: "Plan Proposed",
    followUp: "Follow-up · Day 3",
  },
  {
    name: "Vikram Sethi",
    initials: "VS",
    source: "call",
    interest: "Hair — GFC sessions",
    stage: "Consult Done",
    followUp: "Awaiting plan",
  },
  {
    name: "Meera Iyer",
    initials: "MI",
    source: "whatsapp",
    interest: "Skin — pigmentation",
    stage: "Package Sold",
    followUp: "Session 2 of 6",
  },
];

function LeadRow({ lead, compact = false }: { lead: Lead; compact?: boolean }) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft",
        compact && "p-2.5",
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-bold text-primary-dark">
        {lead.initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-bold">{lead.name}</p>
          {lead.urgent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
              <Clock className="size-2.5" /> Urgent
            </span>
          )}
        </div>
        <p className="truncate text-[11.5px] text-muted-foreground">{lead.interest}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <SourceChip source={lead.source} />
          <StageChip stage={lead.stage} tone={lead.tone ?? "soft"} />
        </div>
      </div>
      {!compact && (
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground/70">Follow-up</p>
          <p className="text-[12px] font-semibold text-primary-dark">{lead.followUp}</p>
        </div>
      )}
    </div>
  );
}

/* ---------------- dashboard ---------------- */

export function DashboardMock({ variant = "hero" }: { variant?: "hero" | "full" }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-float">
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            L
          </span>
          <span className="text-[12.5px] font-bold">Unified Inbox</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            Today · 12 new
          </span>
          <span className="hidden rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary-dark sm:inline">
            Response target &lt;15 min
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-2.5">
          {(variant === "hero" ? leads.slice(0, 3) : leads).map((lead) => (
            <LeadRow key={lead.name} lead={lead} />
          ))}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/70">Pipeline</p>
            <div className="mt-2.5 space-y-2">
              {[
                ["Consult Booked", 18, 100],
                ["Consult Done", 12, 66],
                ["Plan Proposed", 8, 44],
                ["Package Sold", 5, 28],
                ["Sessions Tracked", 4, 22],
              ].map(([label, count, pct]) => (
                <div key={label as string}>
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="font-semibold text-foreground">{label as string}</span>
                    <span className="text-muted-foreground">{count as number}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${pct as number}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary/50 p-3">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Follow-up queue
            </p>
            <ul className="mt-2 space-y-2 text-[11.5px]">
              {[
                ["24h reminder", "Ananya · Consult tomorrow 11:30"],
                ["Day 30", "Rhea · Laser session check-in"],
                ["Day 90", "Kabir · Win-back message"],
              ].map(([tag, text]) => (
                <li key={tag} className="flex items-start gap-2">
                  <span className="mt-px rounded-md bg-card px-1.5 py-0.5 text-[10px] font-bold text-primary-dark">
                    {tag}
                  </span>
                  <span className="text-muted-foreground">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-4 py-3">
        <PipelineStrip />
      </div>
    </div>
  );
}

/* ---------------- phone ---------------- */

function PhoneFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative w-[236px] shrink-0 rounded-[2.2rem] border border-border bg-card p-2 shadow-float">
      <div className="mx-auto mb-2 h-1 w-14 rounded-full bg-border" />
      <div className="overflow-hidden rounded-[1.6rem] bg-background">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-[11.5px] font-bold">{label}</span>
          <span className="size-1.5 rounded-full bg-primary" />
        </div>
        <div className="p-2.5">{children}</div>
      </div>
    </div>
  );
}

export function PhoneInbox() {
  return (
    <PhoneFrame label="Inbox">
      <div className="space-y-2">
        {leads.slice(0, 3).map((lead) => (
          <LeadRow key={lead.name} lead={lead} compact />
        ))}
        <div className="rounded-xl bg-primary p-2.5">
          <p className="text-[11px] font-bold text-primary-foreground">Works on weak networks</p>
          <p className="text-[10.5px] text-primary-foreground/80">Queued actions sync automatically</p>
        </div>
      </div>
    </PhoneFrame>
  );
}

export function PhoneProfile() {
  return (
    <PhoneFrame label="Patient">
      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-[11px] font-bold text-primary-dark">
            AM
          </span>
          <div>
            <p className="text-[12.5px] font-bold">Ananya Mehra</p>
            <p className="text-[10.5px] text-muted-foreground">Botox · Consult booked</p>
          </div>
        </div>
        {["Treatment plan", "Photos & consent", "Payments"].map((item) => (
          <div
            key={item}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-2.5 py-2 text-[11.5px] font-semibold"
          >
            {item}
            <ChevronRight className="size-3.5 text-muted-foreground" />
          </div>
        ))}
        <div className="rounded-xl border border-border bg-secondary/60 p-2.5">
          <p className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground/70">
            WhatsApp follow-up
          </p>
          <p className="mt-1 text-[11.5px] text-foreground">
            “Hi Ananya, your consult is tomorrow at 11:30 AM. Reply 1 to confirm.”
          </p>
          <button
            type="button"
            className="mt-2 w-full rounded-lg bg-primary py-1.5 text-[11px] font-bold text-primary-foreground"
          >
            Send template
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ---------------- patient profile ---------------- */

const profileTabs = [
  { label: "Treatment History", icon: FileText },
  { label: "Consent", icon: ShieldCheck },
  { label: "Photos", icon: ImageIcon },
  { label: "Payments", icon: Wallet },
  { label: "Messages", icon: MessageCircle },
  { label: "Appointments", icon: CalendarCheck },
];

export function PatientProfileMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary-dark">
            AM
          </span>
          <div>
            <p className="text-sm font-bold">Ananya Mehra</p>
            <p className="text-xs text-muted-foreground">28 · Botox &amp; Skin · Patient since Mar 2026</p>
          </div>
        </div>
        <StageChip stage="Package Sold · Session 2 of 6" tone="soft" />
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border bg-secondary/40 p-3">
        {profileTabs.map((tab, i) => (
          <span
            key={tab.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
              i === 0 ? "bg-card text-primary-dark shadow-soft" : "text-muted-foreground hover:text-primary-dark",
            )}
          >
            <tab.icon className="size-3" />
            {tab.label}
          </span>
        ))}
      </div>

      <ol className="space-y-0 p-4">
        {[
          ["Consultation", "12 Mar · Dr. Nair · Forehead lines, mild pigmentation"],
          ["Treatment Plan", "12 Mar · Botox 3 areas + 4 skin sessions"],
          ["Consent", "14 Mar · Signed digitally, stored on file"],
          ["Package", "14 Mar · 6-session package activated"],
          ["Session", "18 Mar · Session 2 completed, photos added"],
        ].map(([title, meta], i, arr) => (
          <li key={title} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </span>
              {i < arr.length - 1 && <span className="w-px flex-1 bg-border" />}
            </div>
            <div className="pb-4">
              <p className="text-[13px] font-bold">{title}</p>
              <p className="text-[11.5px] text-muted-foreground">{meta}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------- whatsapp ---------------- */

const threads = [
  {
    tag: "24h reminder",
    title: "Appointment reminder",
    messages: [
      { from: "clinic", text: "Hi Ananya, this is Aura Skin Clinic. Your consult with Dr. Nair is tomorrow at 11:30 AM." },
      { from: "patient", text: "Yes, confirming. Should I come without makeup?" },
      { from: "clinic", text: "Yes please — it helps us assess your skin properly. See you tomorrow!" },
    ],
  },
  {
    tag: "30 days",
    title: "Treatment follow-up",
    messages: [
      { from: "clinic", text: "Hi Rhea, it's been a month since your laser session. How is the area feeling?" },
      { from: "patient", text: "Much better, hair growth has reduced a lot." },
      { from: "clinic", text: "Great. Session 3 is due next week — shall I hold Saturday 4 PM?" },
    ],
  },
  {
    tag: "90 days",
    title: "Old-patient win-back",
    messages: [
      { from: "clinic", text: "Hi Kabir, it's been a while since your last skin session with us." },
      { from: "clinic", text: "Your maintenance window is open this month. Want us to book a review consult?" },
      { from: "patient", text: "Yes, please share slots for next weekend." },
    ],
  },
];

export function WhatsAppThreads() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {threads.map((thread) => (
        <div key={thread.tag} className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[13px] font-bold text-primary-foreground">{thread.title}</p>
            <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[10.5px] font-bold text-primary-foreground">
              {thread.tag}
            </span>
          </div>
          <div className="space-y-2">
            {thread.messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[92%] rounded-2xl px-3 py-2 text-[11.5px] leading-relaxed",
                  m.from === "clinic"
                    ? "ml-auto rounded-br-md bg-primary-foreground text-foreground"
                    : "rounded-bl-md bg-primary-foreground/12 text-primary-foreground",
                )}
              >
                {m.text}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TemplateCards() {
  const templates = [
    { name: "Botox — Pre-treatment", body: "Avoid blood thinners and alcohol 24h before your appointment.", tag: "Pre" },
    { name: "Laser — Post-treatment", body: "Use SPF 50 daily and skip sun exposure for 48 hours.", tag: "Post" },
    { name: "Skin — Follow-up", body: "How is your skin responding two weeks after the peel?", tag: "Follow-up" },
    { name: "Hair — Reminder", body: "Your GFC session 3 is due this week. Shall we book Saturday?", tag: "Reminder" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {templates.map((t) => (
        <div
          key={t.name}
          className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-card"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[14px] font-bold">{t.name}</p>
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[10.5px] font-bold text-primary-dark">
              {t.tag}
            </span>
          </div>
          <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">“{t.body}”</p>
          <div className="mt-4 flex items-center gap-2 text-[11.5px] font-semibold text-primary-dark">
            <Sparkles className="size-3.5" />
            Send or edit before sending
          </div>
        </div>
      ))}
    </div>
  );
}
