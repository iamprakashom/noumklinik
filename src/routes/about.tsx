import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/luma/Nav";
import { Reveal } from "@/components/luma/Reveal";
import { useDemoModal } from "@/components/luma/BookDemoModal";
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-primary/10 px-3.5 py-1 text-[12px] font-bold uppercase tracking-wider text-primary-dark">
      {children}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  center,
}: {
  eyebrow: string;
  title: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "text-center" : ""}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-[26px] font-extrabold leading-[1.15] sm:text-[32px] lg:text-[36px]">
        {title}
      </h2>
    </div>
  );
}

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Klinik by NouhmAI" },
      {
        name: "description",
        content:
          "Klinik by NouhmAI is a WhatsApp-first CRM built specifically for aesthetic clinics. Learn why we exist and what we believe about running a modern clinic.",
      },
      { property: "og:title", content: "About — Klinik by NouhmAI" },
      {
        property: "og:description",
        content:
          "Klinik by NouhmAI is a WhatsApp-first CRM built specifically for aesthetic clinics. Learn why we exist and what we believe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

function About() {
  return <AboutContent />;
}

const values = [
  {
    title: "WhatsApp is the front desk",
    body: "Patients in India don't download clinic apps — they message. We build around WhatsApp first, not as an afterthought bolted onto a desktop CRM.",
  },
  {
    title: "Software should fit the clinic, not the other way around",
    body: "Aesthetic clinics have their own rhythm: consults, treatment plans, follow-ups, rebooking. KLINIK mirrors that workflow instead of forcing a generic sales pipeline.",
  },
  {
    title: "Mobile-first, not mobile-only",
    body: "Clinic owners run their business from a phone between appointments. Every screen in KLINIK works beautifully on a phone, a tablet, or a desktop.",
  },
  {
    title: "Trust is earned with data care",
    body: "Patient conversations and treatment history are sensitive. We treat consent, access control, and data privacy as core features — not legal footnotes.",
  },
];

const beliefs = [
  "Every enquiry deserves a fast, personal reply",
  "Follow-ups should happen automatically, on time",
  "Owners should see revenue clearly, not guess it",
  "Great care continues after the patient leaves",
];

function AboutContent() {
  const { openDemo } = useDemoModal();
  return (
    <div className="luma-scope min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        {/* Hero */}
        <section className="section-pad px-5 pt-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <Eyebrow>About KLINIK</Eyebrow>
              <h1 className="mt-3 text-[34px] font-extrabold leading-[1.1] sm:text-[44px] lg:text-[52px]">
                Built for the way aesthetic clinics actually work.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
                KLINIK started with a simple observation: aesthetic clinics run on
                WhatsApp, paper, and memory — and the software they were offered
                was built for hospitals or generic sales teams. We set out to
                build the CRM your front desk deserves.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Story */}
        <section className="section-pad px-5 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <SectionHeading
                eyebrow="Why we exist"
                title="The front desk is the growth engine."
              />
              <div className="mt-6 space-y-4 text-[15.5px] leading-relaxed text-foreground/85">
                <p>
                  Most clinics don't lose patients because of treatment quality —
                  they lose them in the gaps: an unanswered WhatsApp enquiry, a
                  follow-up that never happened, a treatment plan that was
                  explained once and forgotten.
                </p>
                <p>
                  We watched front-desk teams juggle three phones, a register,
                  and a spreadsheet — doing heroic work with tools that were
                  never designed for them. KLINIK brings every conversation,
                  patient profile, and treatment plan into one workspace, so
                  nothing slips through.
                </p>
                <p>
                  The result: enquiries convert better, follow-ups run
                  themselves, and owners finally see which treatments and
                  channels actually bring revenue that sticks.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Values */}
        <section className="section-pad px-5 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <SectionHeading
                eyebrow="What we believe"
                title="A few principles we build by."
                center
              />
            </Reveal>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {values.map((v) => (
                <Reveal key={v.title}>
                  <div className="h-full rounded-3xl border border-border bg-card p-7 shadow-card">
                    <h3 className="text-[17px] font-bold">{v.title}</h3>
                    <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted-foreground">
                      {v.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Beliefs strip */}
        <section className="section-pad px-5 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="rounded-3xl border border-border bg-primary/5 p-8 lg:p-10">
                <h2 className="text-[20px] font-extrabold sm:text-[22px]">
                  What a well-run clinic looks like to us
                </h2>
                <ul className="mt-5 space-y-3">
                  {beliefs.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground/85">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="section-pad px-5 pb-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <h2 className="text-[26px] font-extrabold leading-tight sm:text-[32px]">
                See KLINIK on your own clinic's workflow.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-[15.5px] text-muted-foreground">
                A 20-minute walkthrough, tailored to how your front desk works
                today.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={openDemo}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[15px] font-bold text-primary-foreground shadow-card transition-transform hover:scale-[1.03]"
                >
                  Book a Demo <ArrowRight className="size-4" />
                </button>
                <Link
                  to="/"
                  className="text-[14.5px] font-semibold text-primary hover:underline"
                >
                  Back to home
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </div>
  );
}
