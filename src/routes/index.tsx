import { Fragment, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BellRing,
  ChevronRight,
  ClipboardList,
  LineChart,
  Stethoscope,
  Timer,
  Users,
} from "lucide-react";
import { Nav } from "@/components/luma/Nav";
import { Reveal } from "@/components/luma/Reveal";
import { useDemoModal } from "@/components/luma/BookDemoModal";
import logoAsset from "@/assets/klinik-logo.png.asset.json";
import {
  DashboardMock,
  PatientProfileMock,
  PhoneInbox,
  PhoneProfile,
  PipelineStrip,
  TemplateCards,
  WhatsAppThreads,
} from "@/components/luma/mocks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KLINIK By Nouhm — CRM for Cosmetic Clinics & Medspas" },
      {
        name: "description",
        content:
          "KLINIK By Nouhm is a WhatsApp-first CRM for aesthetic clinics: capture enquiries, book consults, propose treatment plans, sell packages and automate follow-ups.",
      },
      { property: "og:title", content: "KLINIK By Nouhm — Turn every enquiry into a patient journey" },
      {
        property: "og:description",
        content:
          "One workspace for WhatsApp, Instagram and call enquiries, consultations, treatment plans, packages, sessions and follow-ups.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-primary-dark">{children}</p>
  );
}

function SectionHeading({
  eyebrow,
  title,
  sub,
  center = false,
  invert = false,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  center?: boolean;
  invert?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <p
          className={`text-[11.5px] font-bold uppercase tracking-[0.18em] ${
            invert ? "text-primary-foreground/70" : "text-primary-dark"
          }`}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`mt-3 text-[28px] font-extrabold leading-[1.15] sm:text-[34px] lg:text-[42px] ${
          invert ? "text-primary-foreground" : "text-foreground"
        }`}
      >
        {title}
      </h2>
      {sub && (
        <p
          className={`mt-4 text-[15px] leading-relaxed sm:text-base ${
            invert ? "text-primary-foreground/75" : "text-muted-foreground"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function Landing() {
  return <LandingContent />;
}

function LandingContent() {
  const { openDemo } = useDemoModal();
  return (
    <div id="top" className="min-h-screen bg-background">
      <Nav />

      <main>
        {/* 1. HERO */}
        <section className="relative overflow-hidden px-5 pb-16 pt-28 lg:px-8 lg:pb-24 lg:pt-40">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -top-24 size-[520px] rounded-full bg-primary-soft blur-3xl opacity-70"
          />
          <div className="relative mx-auto max-w-6xl">
            <Reveal className="max-w-3xl">
              <Eyebrow>Built for aesthetic clinics</Eyebrow>
              <h1 className="mt-4 text-[34px] font-extrabold leading-[1.08] sm:text-5xl lg:text-[60px]">
                Turn every enquiry into a patient journey.
              </h1>
              <p className="mt-6 max-w-2xl text-[15.5px] leading-relaxed text-muted-foreground sm:text-lg">
                Bring WhatsApp, Instagram, calls, consultations, treatment plans and follow-ups into one simple
                workspace — so your team can respond faster, reduce no-shows and convert more patients.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openDemo}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-card transition-all hover:bg-primary-dark hover:shadow-float"
                >
                  Book a Demo <ArrowRight className="size-4" />
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-[15px] font-semibold text-foreground transition-all hover:border-primary/40 hover:text-primary-dark"
                >
                  See How It Works
                </a>
              </div>
            </Reveal>

            <Reveal delay={100} className="mt-8 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-semibold text-foreground">
                <span className="size-2 rounded-full bg-primary" /> WhatsApp-first
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-semibold text-foreground">
                <span className="size-2 rounded-full bg-primary" /> Instagram enquiries
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-semibold text-foreground">
                <span className="size-2 rounded-full bg-primary" /> Call logs
              </span>
            </Reveal>

            <Reveal delay={120} className="mt-10 max-w-2xl">
              <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-primary-dark">One workspace</p>
              <h2 className="mt-3 text-[24px] font-extrabold leading-tight sm:text-[28px] lg:text-[32px]">
                Everything your front desk needs. In one place.
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground sm:text-[15.5px]">
                No more jumping between WhatsApp, spreadsheets, notebooks and appointment diaries. One screen shows
                every lead, its source, the treatment they asked about and exactly which stage they're in.
              </p>
            </Reveal>

            <Reveal delay={160} className="mt-10 lg:mt-14">
              <DashboardMock variant="hero" />
            </Reveal>
          </div>
        </section>

        {/* 2. CORE VALUE */}
        <section id="product" className="section-pad px-5 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <SectionHeading
                eyebrow="Why KLINIK"
                title="Your clinic doesn't need another CRM. It needs a better patient journey."
                center
              />
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: Timer,
                  title: "Respond Faster",
                  body: "Never let a promising enquiry go cold. Unified WhatsApp, Instagram and call inbox.",
                  highlight: "<15 min target response time",
                },
                {
                  icon: BellRing,
                  title: "Follow Up Automatically",
                  body: "Stay connected without remembering everything.",
                  highlight: "24h reminders · 30/60/90-day follow-ups",
                },
                {
                  icon: LineChart,
                  title: "Convert More Patients",
                  body: "See exactly where patients drop off.",
                  highlight: "Consult → Plan → Package → Sessions",
                },
              ].map((card, i) => (
                <Reveal key={card.title} delay={i * 110}>
                  <div className="h-full rounded-2xl border border-border bg-card p-7 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-card">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary-dark">
                      <card.icon className="size-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-bold">{card.title}</h3>
                    <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted-foreground">{card.body}</p>
                    <p className="mt-5 rounded-xl bg-secondary px-3.5 py-2.5 text-[12.5px] font-bold text-primary-dark">
                      {card.highlight}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 4. PATIENT JOURNEY */}
        <section id="how-it-works" className="section-pad px-5 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <SectionHeading
                eyebrow="The patient journey"
                title="From first message to the treatment room — and back again."
                center
              />
            </Reveal>

            <div className="mt-14 flex flex-col gap-2 lg:flex-row lg:items-stretch">
              {[
                { n: "01", title: "Enquiry", body: "WhatsApp / Instagram / Call" },
                { n: "02", title: "Consultation", body: "Booked → Completed" },
                { n: "03", title: "Treatment Plan", body: "Proposed and shared" },
                { n: "04", title: "Package Sold", body: "Sessions and payments set" },
                { n: "05", title: "Sessions Tracked", body: "Photos, notes, progress" },
                { n: "06", title: "Follow-up / Win-back", body: "30 · 60 · 90 days" },
              ].map((step, i, arr) => (
                <Fragment key={step.n}>
                  <Reveal delay={i * 90} className="flex-1">
                    <div className="relative h-full rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-card">
                      <span className="text-[11.5px] font-extrabold tracking-widest text-primary">{step.n}</span>
                      <h3 className="mt-2 text-[15px] font-bold leading-snug">{step.title}</h3>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{step.body}</p>
                    </div>
                  </Reveal>
                  {i < arr.length - 1 && (
                    <div aria-hidden className="flex shrink-0 items-center justify-center py-0.5 lg:py-0 lg:px-1">
                      <ChevronRight className="size-5 rotate-90 text-primary lg:rotate-0" />
                    </div>
                  )}
                </Fragment>
              ))}
            </div>

            <Reveal delay={200} className="mt-10 flex justify-center">
              <div className="overflow-x-auto rounded-2xl border border-border bg-card p-4 shadow-soft">
                <PipelineStrip />
              </div>
            </Reveal>
          </div>
        </section>

        {/* 5. PERSONAS */}
        <section className="section-pad border-y border-border bg-secondary/40 px-5 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <SectionHeading eyebrow="Built for the people who use it" title="One workspace, three points of view." center />
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: ClipboardList,
                  role: "Front Desk",
                  line: "Manage every lead without losing track.",
                  items: ["Lead inbox", "Follow-ups", "WhatsApp templates", "Prioritisation"],
                },
                {
                  icon: Users,
                  role: "Clinic Owner",
                  line: "Know where your patients are dropping off.",
                  items: ["Conversion", "No-shows", "Pipeline visibility"],
                },
                {
                  icon: Stethoscope,
                  role: "Doctor / Counselor",
                  line: "Keep the treatment journey together.",
                  items: ["Treatment history", "Photos", "Consent", "Treatment plan"],
                },
              ].map((p, i) => (
                <Reveal key={p.role} delay={i * 110}>
                  <div className="h-full rounded-2xl border border-border bg-card p-7 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary-dark">
                      <p.icon className="size-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-bold">{p.role}</h3>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{p.line}</p>
                    <ul className="mt-5 flex flex-wrap gap-1.5">
                      {p.items.map((item) => (
                        <li
                          key={item}
                          className="rounded-full border border-border px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 6. MOBILE-FIRST */}
        <section className="section-pad px-5 lg:px-8">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <SectionHeading
                eyebrow="Mobile-first"
                title="Mobile-first, not mobile-only. Every screen works on a phone, a tablet, or a desktop."
                sub="Your front desk works standing up, between rooms and on the phone. Every core screen — inbox, patient profile, pipeline and WhatsApp follow-ups — is built for a phone first, and holds up on weak, unstable connections."
              />
              <ul className="mt-7 space-y-3">
                {[
                  "Reply to a WhatsApp enquiry in two taps",
                  "Move a lead through the pipeline from the floor",
                  "Actions queue and sync when the network returns",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[14.5px] text-foreground">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={140} className="flex justify-center gap-5 overflow-x-auto pb-2 lg:justify-end">
              <div className="translate-y-4">
                <PhoneInbox />
              </div>
              <div className="-translate-y-4">
                <PhoneProfile />
              </div>
            </Reveal>
          </div>
        </section>

        {/* 7. PATIENT PROFILE */}
        <section className="section-pad border-y border-border bg-secondary/40 px-5 lg:px-8">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal>
              <SectionHeading
                eyebrow="Patient profile"
                title="One patient. One complete record."
                sub="Treatment history, consent, photos, payments, messages and appointments live on a single record — so anyone in the clinic can pick up the journey without asking around."
              />
            </Reveal>
            <Reveal delay={130}>
              <PatientProfileMock />
            </Reveal>
          </div>
        </section>

        {/* 8. WHATSAPP AUTOMATION */}
        <section className="section-pad px-5 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-3xl bg-primary-dark px-6 py-14 shadow-float sm:px-10 lg:px-14 lg:py-20">
            <Reveal>
              <SectionHeading
                invert
                center
                eyebrow="WhatsApp automation"
                title="The follow-up your team doesn't have to remember."
                sub="Reminders and check-ins go out on schedule, in your clinic's voice. Your team edits and sends — nothing is left to memory or sticky notes."
              />
            </Reveal>
            <Reveal delay={120} className="mt-10">
              <WhatsAppThreads />
            </Reveal>
            <Reveal delay={200} className="mt-9 flex flex-wrap justify-center gap-2">
              {["24h reminder", "30 days", "60 days", "90 days"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-primary-foreground/25 px-4 py-2 text-[12.5px] font-bold text-primary-foreground"
                >
                  {tag}
                </span>
              ))}
            </Reveal>
          </div>
        </section>

        {/* 9. TEMPLATES */}
        <section className="section-pad border-y border-border bg-secondary/40 px-5 lg:px-8">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <SectionHeading
                eyebrow="Treatment templates"
                title="Your best patient messages, ready when you need them."
                sub="Treatment-specific WhatsApp templates for pre-care, post-care, follow-ups and reminders. Your team sends or edits in seconds instead of rewriting the same message every day."
              />
            </Reveal>
            <Reveal delay={130}>
              <TemplateCards />
            </Reveal>
          </div>
        </section>

        {/* 10. OUTCOMES */}
        <section className="section-pad px-5 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <SectionHeading
                eyebrow="Business outcomes"
                title="Less lead leakage. Fewer no-shows. Revenue that sticks."
                center
              />
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                { big: "<15 min", label: "Target response time", body: "Every new enquiry surfaces in one inbox with an owner and a clock." },
                { big: "Automated reminders", label: "Reduce missed appointments", body: "24h confirmations go out without anyone remembering to send them." },
                { big: "Consult → Package", label: "Track conversion", body: "Follow conversion through the real treatment journey, stage by stage." },
              ].map((o, i) => (
                <Reveal key={o.label} delay={i * 110}>
                  <div className="h-full rounded-2xl border border-border bg-card p-8 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card">
                    <p className="text-[26px] font-extrabold leading-tight text-primary-dark lg:text-[30px]">{o.big}</p>
                    <p className="mt-2 text-[13px] font-bold uppercase tracking-wide text-foreground">{o.label}</p>
                    <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{o.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 11. PILOT */}
        <section className="section-pad border-y border-border bg-secondary/40 px-5 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <Eyebrow>Early access</Eyebrow>
              <h2 className="mt-3 text-[28px] font-extrabold leading-[1.15] sm:text-[34px] lg:text-[40px]">
                Built around the way aesthetic clinics actually work.
              </h2>
              <p className="mt-5 text-[15.5px] leading-relaxed text-muted-foreground">
                Designed for Indian aesthetic clinics, with the workflows of real front-desk teams at
                the center. We're onboarding a small group of pilot clinics and building alongside them.
              </p>
              <button
                type="button"
                onClick={openDemo}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-card transition-all hover:bg-primary-dark hover:shadow-float"
              >
                Join the Pilot <ArrowRight className="size-4" />
              </button>
            </Reveal>
          </div>
        </section>

        {/* 11b. TESTIMONIALS */}
        <section id="testimonials" className="section-pad px-5 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <SectionHeading
                eyebrow="From the people using it"
                title="What early clinics are saying."
                sub="Representative feedback from our pilot clinics as we build KLINIK alongside them."
                center
              />
            </Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  quote:
                    "We used to lose track of WhatsApp enquiries in three different phones. Now every conversation lives in one inbox, and the front desk actually closes the loop.",
                  name: "Dr. Aarti Menon",
                  role: "Founder, Skin & Aesthetics Clinic",
                  initials: "AM",
                  rating: 5,
                },
                {
                  quote:
                    "The treatment plan templates cut our consult-to-payment time in half. Patients get a clear plan on WhatsApp and most just say yes.",
                  name: "Rohan Mehta",
                  role: "Practice Manager, Medspa chain",
                  initials: "RM",
                  rating: 4,
                },
                {
                  quote:
                    "Follow-ups used to be a guessing game. KLINIK nudges patients at the right time and our rebooking rate has gone up without anyone chasing. Took the team a week to get used to it, but worth it.",
                  name: "Dr. Priya Nair",
                  role: "Cosmetic Dermatologist",
                  initials: "PN",
                  rating: 4,
                },
              ].map((t) => (
                <Reveal key={t.name}>
                  <figure className="flex h-full flex-col rounded-3xl border border-border bg-card p-7 shadow-card">
                    <div className="mb-4 flex gap-1" aria-label={`${t.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className={`size-4 ${i < t.rating ? "text-amber-400" : "text-muted-foreground/25"}`}
                          aria-hidden
                        >
                          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9 4.8 17.6l1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
                        </svg>
                      ))}
                    </div>
                    <blockquote className="flex-1 text-[15px] leading-relaxed text-foreground/90">
                      "{t.quote}"
                    </blockquote>
                    <figcaption className="mt-6 flex items-center gap-3">
                      <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-[14px] font-extrabold text-primary-dark">
                        {t.initials}
                      </span>
                      <span className="leading-tight">
                        <span className="block text-[14px] font-bold text-foreground">{t.name}</span>
                        <span className="block text-[12.5px] text-muted-foreground">{t.role}</span>
                      </span>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
        <section id="pricing" className="section-pad px-5 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="rounded-3xl border border-border bg-card p-9 text-center shadow-card lg:p-14">
                <Eyebrow>Pricing</Eyebrow>
                <h2 className="mt-3 text-[28px] font-extrabold leading-[1.15] sm:text-[34px] lg:text-[40px]">
                  Simple pricing. No surprises.
                </h2>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {["One flat monthly fee", "No commission per booking"].map((item) => (
                    <p
                      key={item}
                      className="rounded-2xl bg-secondary px-5 py-5 text-[15px] font-bold text-primary-dark"
                    >
                      {item}
                    </p>
                  ))}
                </div>
                <p className="mt-6 text-[14px] text-muted-foreground">
                  Final plans are being set with our pilot clinics. Talk to us and we'll walk you through what your
                  clinic would pay.
                </p>
                <button
                  type="button"
                  onClick={openDemo}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-dark hover:shadow-card"
                >
                  Talk to Us <ArrowRight className="size-4" />
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 13. FAQ */}
        <section id="faq" className="section-pad border-y border-border bg-secondary/40 px-5 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <SectionHeading
                eyebrow="Questions"
                title="Everything you might want to know."
                sub="Pricing, onboarding, WhatsApp and your data — answered straight."
                center
              />
            </Reveal>
            <div className="mt-10 space-y-3">
              {[
                {
                  q: "How much does KLINIK cost?",
                  a: "KLINIK is a flat monthly subscription — no commission per booking and no per-message fees. Final plans are being set with our pilot clinics, so talk to us and we'll walk you through what your clinic would pay based on your team size and volume.",
                },
                {
                  q: "What does onboarding look like?",
                  a: "We onboard pilot clinics personally: a short kickoff call, a 30-minute setup of your services and treatment-plan templates, and we migrate your existing patient list into KLINIK. Most clinics are fully up and running within a day, and we stay close during the first few weeks.",
                },
                {
                  q: "How does the WhatsApp integration work?",
                  a: "KLINIK connects through the official WhatsApp Business Platform, so messages are sent and received from your clinic's own verified number. Every enquiry lands in one shared inbox, templates keep replies consistent, and automated follow-ups go out without anyone on your team having to remember.",
                },
                {
                  q: "How is my clinic's data protected?",
                  a: "Patient data is encrypted in transit and at rest, access is scoped per team member, and we never sell or share your data. You own your data and can export or delete it at any time. KLINIK is built to respect patient consent and the privacy expectations of Indian aesthetic clinics.",
                },
                {
                  q: "Can I use KLINIK on my phone?",
                  a: "Yes — KLINIK is mobile-first. Every screen, from the inbox to treatment plans to follow-ups, works on a phone, a tablet, or a desktop, so your front desk and clinicians can use it wherever they are.",
                },
                {
                  q: "What if I want to leave?",
                  a: "There are no lock-in contracts. You can export your full patient list and conversation history at any time, and we'll help you migrate off if you decide KLINIK isn't the right fit.",
                },
              ].map((item, i) => (
                <Reveal key={item.q}>
                  <details className="group rounded-2xl border border-border bg-card px-5 py-4 shadow-soft [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                      <span className="text-[15.5px] font-bold text-foreground">{item.q}</span>
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-dark transition-transform duration-300 group-open:rotate-45">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                          <path d="M9 3h2v6h6v2h-6v6H9v-6H3V9h6V3z" />
                        </svg>
                      </span>
                    </summary>
                    <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">{item.a}</p>
                  </details>
                </Reveal>
              ))}
            </div>
            <Reveal>
              <p className="mt-8 text-center text-[14px] text-muted-foreground">
                Still have a question?{" "}
                <button
                  type="button"
                  onClick={openDemo}
                  className="font-bold text-primary-dark underline-offset-4 hover:underline"
                >
                  Talk to us
                </button>{" "}
                and we'll answer it directly.
              </p>
            </Reveal>
          </div>
        </section>

        {/* 14. FINAL CTA */}
        <section id="demo" className="section-pad px-5 lg:px-8">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center shadow-float sm:px-10 lg:px-16 lg:py-20">
            <Reveal>
              <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-primary-foreground/70">
                Book a Demo
              </p>
              <h2 className="mx-auto mt-3 max-w-2xl text-[28px] font-extrabold leading-[1.1] text-primary-foreground sm:text-[34px] lg:text-[40px]">
                Stop losing patients between the first message and the treatment room.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-primary-foreground/80">
                Give your team one simple workspace for leads, consultations, treatments and follow-ups. Book a
                20-minute walkthrough and we'll show you KLINIK on your clinic's workflow.
              </p>
              <button
                type="button"
                onClick={openDemo}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-7 py-4 text-[16px] font-bold text-primary shadow-card transition-all hover:bg-primary-foreground/90 hover:shadow-float"
              >
                Book a Demo <ArrowRight className="size-4" />
              </button>
              <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {[
                  "Personal walkthrough on your clinic's workflow",
                  "No commitment, no card required",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-[13.5px] font-semibold text-primary-foreground/90">
                    <span className="size-1.5 rounded-full bg-primary-foreground" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-secondary px-5 py-12 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2.5">
                <img
                  src={logoAsset.url}
                  alt="KLINIK By Nouhm logo"
                  className="size-9 rounded-full"
                />
                <span className="text-[15px] font-extrabold">KLINIK <span className="font-semibold text-muted-foreground">By Nouhm</span></span>
              </div>
              <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
                The WhatsApp-first CRM built for how Indian aesthetic clinics actually work.
              </p>
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-foreground">Product</h3>
              <ul className="mt-3 space-y-2.5">
                {[
                  { label: "Features", href: "#product" },
                  { label: "How it works", href: "#how-it-works" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "FAQ", href: "#faq" },
                  { label: "Book a demo", href: "#demo" },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-[13px] text-muted-foreground transition-colors hover:text-primary">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-foreground">Company</h3>
              <ul className="mt-3 space-y-2.5">
                <li>
                  <Link to="/about" className="text-[13px] text-muted-foreground transition-colors hover:text-primary">
                    About
                  </Link>
                </li>
                <li>
                  <a href="#demo" className="text-[13px] text-muted-foreground transition-colors hover:text-primary">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-foreground">Legal</h3>
              <ul className="mt-3 space-y-2.5">
                {["Privacy", "Terms", "Consent & data"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[13px] text-muted-foreground transition-colors hover:text-primary">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
            <p className="text-[12.5px] text-muted-foreground">© 2026 KLINIK. All rights reserved.</p>
            <p className="text-[12.5px] text-muted-foreground">Made for aesthetic clinics.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
