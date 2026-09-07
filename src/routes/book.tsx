import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarCheck, CheckCircle2, Clock } from "lucide-react";
import { Field, inputClass, textareaClass } from "@/components/clinic/bits";
import { primaryButton } from "@/components/clinic/AppShell";
import { getBookingOptions, requestBooking } from "@/lib/booking.functions";
import { money, toLocalInputValue } from "@/data/clinic";
import { validateAppointmentTime } from "@/lib/clinic-hours";
import { TimePickerSelector } from "@/components/clinic/TimePickerSelector";

export const Route = createFileRoute("/book")({
  validateSearch: z.object({ c: z.string().uuid().optional() }),
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
  const { c: clinicId } = Route.useSearch();
  const fetchOptions = useServerFn(getBookingOptions);
  const send = useServerFn(requestBooking);
  const [done, setDone] = useState(false);

  const options = useQuery({
    queryKey: ["booking_options", clinicId],
    queryFn: () => fetchOptions({ data: { clinicId: clinicId! } }),
    enabled: Boolean(clinicId),
  });

  const submit = useMutation({
    mutationFn: (values: Record<string, string>) =>
      send({
        data: {
          clinicId: clinicId!,
          full_name: values["full_name"] ?? "",
          phone: values["phone"] ?? "",
          email: values["email"] || null,
          birth_date: values["birth_date"] || null,
          gender: values["gender"] || null,
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

  if (!clinicId) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Booking link incomplete</h1>
        <p className="text-sm text-muted-foreground">
          Please use the booking link your clinic shared with you.
        </p>
      </Shell>
    );
  }

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
      <header className="space-y-1 text-center">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          {clinic?.name ?? "Aesthetic clinic"}
          {clinic?.city ? ` · ${clinic.city}` : ""}
        </p>
        <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold">
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
          const vals = Object.fromEntries(fd) as Record<string, string>;

          if (vals["preferred_at"]) {
            const err = validateAppointmentTime(vals["preferred_at"], options.data?.clinic);
            if (err) {
              toast.error(err);
              return;
            }
          }
          if (vals["alternate_at"]) {
            const err = validateAppointmentTime(vals["alternate_at"], options.data?.clinic);
            if (err) {
              toast.error(`Backup slot: ${err}`);
              return;
            }
            if (
              vals["preferred_at"] &&
              new Date(vals["alternate_at"]) < new Date(vals["preferred_at"])
            ) {
              toast.error("Backup appointment date must be after or equal to the preferred date.");
              return;
            }
          }

          submit.mutate(vals);
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of birth (optional)">
            <input
              name="birth_date"
              type="date"
              max={toLocalInputValue(new Date()).slice(0, 10)}
              className={inputClass}
            />
          </Field>
          <Field label="Gender">
            <select name="gender" required className={inputClass} defaultValue="">
              <option value="" disabled>
                Select gender…
              </option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </Field>
        </div>
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
        <Field as="div" label="Preferred date and time">
          <TimePickerSelector name="preferred_at" required clinic={options.data?.clinic} />
        </Field>
        <Field as="div" label="Backup slot (optional)">
          <TimePickerSelector name="alternate_at" clinic={options.data?.clinic} />
        </Field>
        <Field label="Anything we should know?">
          <textarea name="notes" className={textareaClass} />
        </Field>
        <div className="flex flex-col items-center gap-2 pt-2">
          <button className={`${primaryButton} w-auto px-8`} disabled={submit.isPending}>
            {submit.isPending ? "Booking…" : "Book appointment"}
          </button>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> This is a request, not a confirmed booking.
          </p>
        </div>
      </form>
    </Shell>
  );
}
