import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type FormState = {
  name: string;
  clinic: string;
  whatsapp: string;
  role: string;
  city: string;
  day: string;
  time: string;
  notes: string;
};

const empty: FormState = {
  name: "",
  clinic: "",
  whatsapp: "",
  role: "Owner / Clinic Head",
  city: "",
  day: "",
  time: "",
  notes: "",
};

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const times = [
  "10:00 AM – 10:30 AM",
  "11:00 AM – 11:30 AM",
  "12:00 PM – 12:30 PM",
  "2:00 PM – 2:30 PM",
  "4:00 PM – 4:30 PM",
  "6:00 PM – 6:30 PM",
];

const inputClass =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-[14.5px] text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const labelClass =
  "mb-1.5 block text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

export function BookDemoForm() {
  const [form, setForm] = useState<FormState>(empty);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Please tell us your name";
    if (!form.clinic.trim()) next.clinic = "Clinic name is required";
    if (!form.whatsapp.trim()) {
      next.whatsapp = "WhatsApp number is required";
    } else if (!/^[+]?[\d\s-]{8,15}$/.test(form.whatsapp.trim())) {
      next.whatsapp = "Enter a valid WhatsApp number";
    }
    if (!form.day) next.day = "Pick a day";
    if (!form.time) next.time = "Pick a time";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl bg-secondary p-8 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-8" strokeWidth={3} />
        </div>
        <h3 className="mt-6 text-[22px] font-extrabold text-foreground">
          You're on the list, {form.name.split(" ")[0]}!
        </h3>
        <p className="mt-3 max-w-sm text-[14.5px] leading-relaxed text-muted-foreground">
          We'll confirm your {form.day} {form.time} slot on WhatsApp shortly.
          Expect a message from the KLINIK team at the number you shared.
        </p>
        <button
          type="button"
          onClick={() => {
            setForm(empty);
            setSubmitted(false);
          }}
          className="mt-6 text-[13px] font-semibold text-primary-dark underline-offset-4 hover:underline"
        >
          Book another demo
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-2xl bg-secondary/60 p-5 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="bd-name">
            Your name *
          </label>
          <input
            id="bd-name"
            className={cn(inputClass, errors.name && "border-red-400 bg-red-50")}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Dr. Ananya Rao"
            autoComplete="name"
          />
          {errors.name && <p className="mt-1 text-[12px] text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="bd-clinic">
            Clinic name *
          </label>
          <input
            id="bd-clinic"
            className={cn(inputClass, errors.clinic && "border-red-400 bg-red-50")}
            value={form.clinic}
            onChange={(e) => update("clinic", e.target.value)}
            placeholder="Glow Aesthetics Clinic"
          />
          {errors.clinic && <p className="mt-1 text-[12px] text-red-600">{errors.clinic}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="bd-whatsapp">
            WhatsApp number *
          </label>
          <input
            id="bd-whatsapp"
            inputMode="tel"
            className={cn(inputClass, errors.whatsapp && "border-red-400 bg-red-50")}
            value={form.whatsapp}
            onChange={(e) => update("whatsapp", e.target.value)}
            placeholder="+91 98xxx xxxxx"
            autoComplete="tel"
          />
          {errors.whatsapp && <p className="mt-1 text-[12px] text-red-600">{errors.whatsapp}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="bd-city">
            City
          </label>
          <input
            id="bd-city"
            className={inputClass}
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="Mumbai"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="bd-day">
            Preferred day *
          </label>
          <select
            id="bd-day"
            className={cn(inputClass, "appearance-none", errors.day && "border-red-400 bg-red-50")}
            value={form.day}
            onChange={(e) => update("day", e.target.value)}
          >
            <option value="" disabled>
              Select a day
            </option>
            {days.map((d) => (
              <option key={d} value={d} className="text-foreground">
                {d}
              </option>
            ))}
          </select>
          {errors.day && <p className="mt-1 text-[12px] text-red-600">{errors.day}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="bd-time">
            Preferred time *
          </label>
          <select
            id="bd-time"
            className={cn(inputClass, "appearance-none", errors.time && "border-red-400 bg-red-50")}
            value={form.time}
            onChange={(e) => update("time", e.target.value)}
          >
            <option value="" disabled>
              Select a slot
            </option>
            {times.map((t) => (
              <option key={t} value={t} className="text-foreground">
                {t}
              </option>
            ))}
          </select>
          {errors.time && <p className="mt-1 text-[12px] text-red-600">{errors.time}</p>}
        </div>
      </div>

      <div className="mt-4">
        <label className={labelClass} htmlFor="bd-notes">
          Anything we should know?
        </label>
        <textarea
          id="bd-notes"
          rows={3}
          className={cn(inputClass, "resize-none")}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Team size, current tools, what you'd like to fix first…"
        />
      </div>

      <button
        type="submit"
        className="mt-6 w-full rounded-xl bg-primary px-6 py-3.5 text-[15px] font-bold text-primary-foreground shadow-card transition hover:bg-primary-dark"
      >
        Confirm my demo slot
      </button>
      <p className="mt-3 text-center text-[12px] text-muted-foreground">
        We'll confirm on WhatsApp. No spam, ever.
      </p>
    </form>
  );
}
