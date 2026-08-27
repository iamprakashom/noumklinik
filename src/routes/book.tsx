import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarCheck, CheckCircle2, Clock } from "lucide-react";
import { Field, inputClass, textareaClass } from "@/components/clinic/bits";
import { primaryButton } from "@/components/clinic/AppShell";
import { getBookingOptions, requestBooking } from "@/lib/booking.functions";
import { money } from "@/data/clinic";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book an appointment — Luma Aesthetics Clinic" },
      {
        name: "description",
        content:
          "Request an appointment at our aesthetic clinic online. Choose your treatment, preferred doctor and time — our front desk confirms within clinic hours.",
      },
      { property: "og:title", content: "Book an appointment — Luma Aesthetics Clinic" },
      {
        property: "og:description",
        content: "Request a consultation or treatment slot online in under a minute.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingPage,
  errorComponent: () => (
    <Shell>
      <p className="text-sm">Booking is temporarily unavailable. Please call the clinic.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="text-sm">Page not found.</p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-5 py-12">
      {children}
    </main>
  );
}

function BookingPage() {
  const fetchOptions = useServerFn(getBookingOptions);
  const send = useServerFn(requestBooking);
  const [done, setDone] = useState(false);

  const options = useQuery({ queryKey: ["booking_options"], queryFn: () => fetchOptions() });

  const submit = useMutation({
    mutationFn: (values: Record<string, string>) =>
      send({
        data: {
          full_name: values["full_name"] ?? "",
          phone: values["phone"] ?? "",
          email: values["email"] || null,
          service_id: values["service_id"] || null,
          provider_id: values["provider_id"] || null,
          preferred_at: values["preferred_at"] ?? "",
          alternate_at: values["alternate_at"] || null,
          notes: values["notes"] || null,
        },
      }),
    onSuccess: () => setDone(true),
    onError: (e: Error) => toast.error(e.message),
  });

  const clinic = options.data?.clinic;

  if (done) {
    return (
      <Shell>
        <CheckCircle2 className="size-8 text-primary" />
        <h1 className="text-2xl font-semibold">Request received</h1>
        <p className="text-sm text-muted-foreground">
          {clinic?.name ?? "The clinic"} will call you back to confirm your slot.
          {clinic?.phone ? ` For anything urgent, call ${clinic.phone}.` : ""}
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="space-y-1">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          {clinic?.name ?? "Aesthetic clinic"}
          {clinic?.city ? ` · ${clinic.city}` : ""}
        </p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <CalendarCheck className="size-5 text-primary" /> Book an appointment
        </h1>
        <p className="text-sm text-muted-foreground">
          Tell us what you need and when suits you. We confirm every request personally.
        </p>
      </header>

      <form
        className="grid gap-4 rounded-xl border border-border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          submit.mutate(Object.fromEntries(fd) as Record<string, string>);
        }}
      >
        <Field label="Your name">
          <input name="full_name" required minLength={2} className={inputClass} />
        </Field>
        <Field label="Mobile number">
          <input name="phone" required inputMode="tel" className={inputClass} />
        </Field>
        <Field label="Email (optional)">
          <input name="email" type="email" className={inputClass} />
        </Field>
        <Field label="Treatment">
          <select name="service_id" className={inputClass} defaultValue="">
            <option value="">Not sure — please advise</option>
            {options.data?.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.duration_min} min · {money(s.price)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Preferred doctor (optional)">
          <select name="provider_id" className={inputClass} defaultValue="">
            <option value="">No preference</option>
            {options.data?.providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Preferred date and time">
          <input name="preferred_at" type="datetime-local" required className={inputClass} />
        </Field>
        <Field label="Backup slot (optional)">
          <input name="alternate_at" type="datetime-local" className={inputClass} />
        </Field>
        <Field label="Anything we should know?">
          <textarea name="notes" className={textareaClass} />
        </Field>
        <button className={primaryButton} disabled={submit.isPending}>
          {submit.isPending ? "Sending…" : "Request appointment"}
        </button>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" /> This is a request, not a confirmed booking.
        </p>
      </form>
    </Shell>
  );
}
