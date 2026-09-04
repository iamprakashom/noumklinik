import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { AppShell, ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Avatar, Chip, EmptyState, Field, inputClass, textareaClass } from "@/components/clinic/bits";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CHANNELS, LEAD_SOURCES, age, formatDate, initials, patientName } from "@/data/clinic";
import { useAppointments, useInsert, usePatients } from "@/lib/clinic-data";

export const Route = createFileRoute("/_authenticated/patients/")({
  head: () => ({
    meta: [
      { title: "Patients — Luma Aesthetics Clinic CRM" },
      {
        name: "description",
        content:
          "Search patient records, review contact details, treatment tags, clinical alerts and visit history for your aesthetics clinic.",
      },
      { property: "og:title", content: "Patients — Luma Aesthetics Clinic CRM" },
      {
        property: "og:description",
        content: "Every patient record, alert and visit in one searchable list.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { new?: boolean } =>
    search["new"] === true || search["new"] === "true" ? { new: true } : {},
  component: PatientsPage,
});

function PatientsPage() {
  const { new: openNew } = Route.useSearch();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(openNew ?? false);
  const [ignoreDupe, setIgnoreDupe] = useState<string | null>(null);
  const patients = usePatients();
  const appointments = useAppointments();
  const createPatient = useInsert("patients");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (patients.data ?? []).filter(
      (p) =>
        !q ||
        patientName(p).toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q),
    );
  }, [patients.data, query]);

  const lastVisit = (id: string) => {
    const past = (appointments.data ?? [])
      .filter((a) => a.patient_id === id && new Date(a.starts_at) <= new Date())
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
    return past[0]?.starts_at ?? null;
  };
  const nextVisit = (id: string) => {
    const future = (appointments.data ?? [])
      .filter((a) => a.patient_id === id && new Date(a.starts_at) > new Date())
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return future[0]?.starts_at ?? null;
  };

  function submit(form: HTMLFormElement) {
    const fd = new FormData(form);
    const digits = (v: string) => v.replace(/\D/g, "").slice(-10);
    const phone = String(fd.get("phone") ?? "");
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const dupe = (patients.data ?? []).find(
      (p) =>
        (phone.length >= 10 && digits(p.phone ?? "") === digits(phone)) ||
        (email && (p.email ?? "").toLowerCase() === email),
    );
    if (dupe && dupe.id !== ignoreDupe) {
      setIgnoreDupe(dupe.id);
      toast.warning(`${patientName(dupe)} already exists with these contact details`, {
        description: "Press Save again to create a separate record anyway.",
      });
      return;
    }
   const birthDate = String(fd.get("birth_date") || "");
if (birthDate && birthDate > new Date().toLocaleDateString("en-CA")) {
  toast.error("Date of birth cannot be in the future");
  return;
}   
    createPatient.mutate(
      {
        first_name: String(fd.get("first_name")),
        last_name: String(fd.get("last_name")),
        email: String(fd.get("email")) || null,
        phone: String(fd.get("phone")) || null,
        birth_date: birthDate || null,
        gender: String(fd.get("gender")) || null,
        source: String(fd.get("source")),
        preferred_channel: String(fd.get("preferred_channel")),
        allergies: String(fd.get("allergies")) || null,
        alerts: String(fd.get("alerts")) || null,
      },
      {
        onSuccess: () => {
          toast.success("Patient added");
          setIgnoreDupe(null);
          setOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <AppShell
      title="Patients"
      subtitle={`${rows.length} record${rows.length === 1 ? "" : "s"}`}
      actions={
        <>
          <div className="relative">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, phone"
              className={`${inputClass} w-64 pl-8`}
            />
          </div>
          <button className={primaryButton} onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> New patient
          </button>
        </>
      }
    >
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState>No patients match your search.</EmptyState>
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Patient</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Tags</th>
                <th className="px-5 py-3 font-medium">Last visit</th>
                <th className="px-5 py-3 font-medium">Next visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-secondary/60">
                  <td className="px-5 py-3">
                    <Link
                      to="/patients/$patientId"
                      params={{ patientId: p.id }}
                      className="flex items-center gap-3"
                    >
                      <Avatar label={initials(patientName(p))} />
                      <span>
                        <span className="block font-medium">{patientName(p)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {age(p.birth_date) ? `${age(p.birth_date)} yrs · ` : ""}
                          {p.source}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    <span className="block">{p.email ?? "—"}</span>
                    <span className="block">{p.phone ?? "—"}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex flex-wrap gap-1">
                      {p.alerts ? <Chip tone="overdue">Alert</Chip> : null}
                      {p.tags.map((t) => (
                        <Chip key={t}>{t}</Chip>
                      ))}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {formatDate(lastVisit(p.id))}
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {formatDate(nextVisit(p.id))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New patient</DialogTitle>
          </DialogHeader>
          <form
            id="new-patient"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(e.currentTarget);
            }}
          >
            <Field label="First name">
              <input name="first_name" required className={inputClass} />
            </Field>
            <Field label="Last name">
              <input name="last_name" required className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" className={inputClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" className={inputClass} />
            </Field>
            <Field label="Date of birth">
              <input
                name="birth_date"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                className={inputClass}
              />
            </Field>
            <Field label="Gender">
              <select name="gender" className={inputClass} defaultValue="">
                <option value="">Not specified</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </Field>
            <Field label="Source">
              <select name="source" className={inputClass}>
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Preferred channel">
              <select name="preferred_channel" className={inputClass}>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Allergies" className="sm:col-span-2">
              <textarea name="allergies" className={textareaClass} />
            </Field>
            <Field label="Clinical alerts" className="sm:col-span-2">
              <textarea name="alerts" className={textareaClass} />
            </Field>
          </form>
          <DialogFooter>
            <button type="button" className={ghostButton} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="new-patient"
              className={primaryButton}
              disabled={createPatient.isPending}
            >
              Add patient
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
