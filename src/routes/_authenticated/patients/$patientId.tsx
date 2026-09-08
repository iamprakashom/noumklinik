import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, FileSignature, Link2, Lock, Plus } from "lucide-react";
import { AppShell, ghostButton, primaryButton } from "@/components/clinic/AppShell";
import {
  Avatar,
  Chip,
  EmptyState,
  Field,
  inputClass,
  textareaClass,
} from "@/components/clinic/bits";
import { PatientPackages } from "@/components/clinic/PatientPackages";
import { NotePhotos, PatientPhotos } from "@/components/clinic/PatientPhotos";
import { SignaturePad } from "@/components/clinic/SignaturePad";
import { createPatientLink } from "@/lib/patient-links.functions";
import { useServerFn } from "@tanstack/react-start";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppointmentDetailDialog } from "@/components/clinic/AppointmentDetailDialog";
import {
  age,
  appointmentTone,
  formatDate,
  formatDateTime,
  initials,
  invoiceTone,
  money,
  patientName,
  type Appointment,
} from "@/data/clinic";
import {
  useAppointments,
  useConsentTemplates,
  useInsert,
  useInvoices,
  useOutbox,
  usePatientConsents,
  usePatients,
  useProviders,
  useRooms,
  useServices,
  useTreatmentRecords,
  useUpdate,
} from "@/lib/clinic-data";

export const Route = createFileRoute("/_authenticated/patients/$patientId")({
  head: () => ({
    meta: [
      { title: "Patient chart — Noum Klinik" },
      {
        name: "description",
        content:
          "Patient chart with visit history, clinical treatment notes, signed consents, invoices and communication timeline.",
      },
      { property: "og:title", content: "Patient chart — Noum Klinik" },
      {
        property: "og:description",
        content: "Clinical notes, consents, billing and messages for a single patient.",
      },
    ],
  }),
  component: PatientDetail,
});

function PatientDetail() {
  const { patientId } = useParams({ from: "/_authenticated/patients/$patientId" });
  const patients = usePatients();
  const appointments = useAppointments();
  const records = useTreatmentRecords();
  const consents = usePatientConsents();
  const consentTemplates = useConsentTemplates();
  const invoices = useInvoices();
  const outbox = useOutbox();
  const providers = useProviders();
  const rooms = useRooms();
  const services = useServices();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const addRecord = useInsert("treatment_records");
  const updateRecord = useUpdate("treatment_records");
  const addConsent = useInsert("patient_consents");
  const updatePatient = useUpdate("patients");

  const [chartOpen, setChartOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [addendumFor, setAddendumFor] = useState<string | null>(null);
  const makeLink = useServerFn(createPatientLink);

  async function shareLink(kind: "intake" | "consent", consentTemplateId?: string | null) {
    try {
      const res = await makeLink({
        data: { patient_id: patientId, kind, consent_template_id: consentTemplateId ?? null },
      });
      const url = `${window.location.origin}/p/${res.token}`;
      await navigator.clipboard.writeText(url).catch(() => undefined);
      toast.success("Patient link copied", { description: url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create link");
    }
  }

  const patient = patients.data?.find((p) => p.id === patientId);

  if (patients.isLoading) {
    return (
      <AppShell title="Patient">
        <p className="text-xs text-muted-foreground">Loading chart…</p>
      </AppShell>
    );
  }
  if (!patient) {
    return (
      <AppShell title="Patient not found">
        <EmptyState>
          This patient no longer exists.{" "}
          <Link to="/patients" className="text-primary hover:underline">
            Back to patients
          </Link>
        </EmptyState>
      </AppShell>
    );
  }

  const visits = (appointments.data ?? [])
    .filter((a) => a.patient_id === patientId)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const charts = (records.data ?? []).filter((r) => r.patient_id === patientId);
  const signed = (consents.data ?? []).filter((c) => c.patient_id === patientId);
  const bills = (invoices.data ?? []).filter((i) => i.patient_id === patientId);
  const messages = (outbox.data ?? []).filter((m) => m.patient_id === patientId);
  const selectedService = services.data?.find((s) => s.name === serviceId);
  const balance = bills.filter((i) => i.status === "Open").reduce((s, i) => s + Number(i.total), 0);

  function saveChart(form: HTMLFormElement) {
    const fd = new FormData(form);
    addRecord.mutate(
      {
        patient_id: patientId,
        appointment_id: String(fd.get("appointment_id")) || null,
        provider_id: String(fd.get("provider_id")) || null,
        service_name: String(fd.get("service_name")),
        product: String(fd.get("product")) || null,
        units: fd.get("units") ? Number(fd.get("units")) : null,
        device_settings: String(fd.get("device_settings")) || null,
        subjective: String(fd.get("subjective")) || null,
        objective: String(fd.get("objective")) || null,
        assessment: String(fd.get("assessment")) || null,
        plan: String(fd.get("plan")) || null,
      },
      {
        onSuccess: () => {
          toast.success("Treatment note saved");
          setChartOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <AppShell
      title={patientName(patient)}
      subtitle={`${age(patient.birth_date) ? `${age(patient.birth_date)} yrs · ` : ""}${patient.source} · prefers ${patient.preferred_channel}`}
      actions={
        <Link to="/patients" className={ghostButton}>
          <ArrowLeft className="size-3.5" /> All patients
        </Link>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-5 py-4">
        <Avatar label={initials(patientName(patient))} className="size-10 text-sm" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{patient.email ?? "No email"}</p>
          <p className="text-xs text-muted-foreground">{patient.phone ?? "No phone"}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {patient.alerts ? <Chip tone="overdue">{patient.alerts}</Chip> : null}
          {patient.allergies ? <Chip tone="progress">Allergies: {patient.allergies}</Chip> : null}
          {patient.tags.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
          {balance > 0 ? <Chip tone="progress">Balance {money(balance)}</Chip> : null}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="no-scrollbar max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="consents">Consents</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="mt-4">
          <PatientPhotos patientId={patient.id} />
        </TabsContent>

        <TabsContent value="packages" className="mt-4">
          <PatientPackages patientId={patient.id} />
        </TabsContent>

        <TabsContent value="overview" className="mt-4">
          <form
            className="grid max-w-2xl gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const birthDate = String(fd.get("birth_date") || "");
              if (birthDate && birthDate > new Date().toLocaleDateString("en-CA")) {
                toast.error("Date of birth cannot be in the future");
                return;
              }
              updatePatient.mutate(
                {
                  id: patientId,
                  values: {
                    email: String(fd.get("email")) || null,
                    phone: String(fd.get("phone")) || null,
                    birth_date: birthDate || null,
                    preferred_channel: String(fd.get("preferred_channel")),
                    allergies: String(fd.get("allergies")) || null,
                    alerts: String(fd.get("alerts")) || null,
                    notes: String(fd.get("notes")) || null,
                  },
                },
                { onSuccess: () => toast.success("Patient updated") },
              );
            }}
          >
            <Field label="Email">
              <input name="email" defaultValue={patient.email ?? ""} className={inputClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" defaultValue={patient.phone ?? ""} className={inputClass} />
            </Field>
            <Field label="Date of birth">
              <input
                name="birth_date"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                defaultValue={patient.birth_date ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Preferred channel">
              <select
                name="preferred_channel"
                defaultValue={patient.preferred_channel}
                className={inputClass}
              >
                <option>Email</option>
                <option>SMS</option>
                <option>WhatsApp</option>
              </select>
            </Field>
            <Field label="Allergies" className="sm:col-span-2">
              <textarea
                name="allergies"
                defaultValue={patient.allergies ?? ""}
                className={textareaClass}
              />
            </Field>
            <Field label="Clinical alerts" className="sm:col-span-2">
              <textarea
                name="alerts"
                defaultValue={patient.alerts ?? ""}
                className={textareaClass}
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea name="notes" defaultValue={patient.notes ?? ""} className={textareaClass} />
            </Field>
            <div className="sm:col-span-2">
              <button className={primaryButton} disabled={updatePatient.isPending}>
                Save changes
              </button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            {visits.length === 0 ? (
              <div className="p-5">
                <EmptyState>No visits recorded.</EmptyState>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {visits.map((v) => (
                  <li
                    key={v.id}
                    className="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                    onClick={() => setSelectedAppointment(v)}
                  >
                    <span className="w-44 text-xs text-muted-foreground">
                      {formatDateTime(v.starts_at)}
                    </span>
                    <span className="flex-1 text-sm font-medium">
                      {services.data?.find((s) => s.id === v.service_id)?.name ?? "Service"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {providers.data?.find((p) => p.id === v.provider_id)?.name ?? "—"}
                    </span>
                    {v.cancellation_reason ? (
                      <span className="text-[11px] text-muted-foreground">
                        {v.cancellation_reason}
                      </span>
                    ) : null}
                    {v.is_override ? (
                      <Chip tone="progress" className="text-[10px]">
                        Overridden
                      </Chip>
                    ) : null}
                    <Chip tone={appointmentTone(v.status)}>{v.status}</Chip>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="charts" className="mt-4 space-y-4">
          <button className={primaryButton} onClick={() => setChartOpen(true)}>
            <Plus className="size-3.5" /> New treatment note
          </button>
          {charts.length === 0 ? (
            <EmptyState>No clinical notes yet.</EmptyState>
          ) : (
            charts.map((r) => (
              <article key={r.id} className="rounded-xl border border-border bg-card p-5">
                <header className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{r.service_name}</h3>
                  <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                  {r.signed_at ? (
                    <Chip tone="completed">
                      <Lock className="mr-1 size-3" /> Signed by {r.signed_by}
                    </Chip>
                  ) : (
                    <Chip tone="progress">Unsigned</Chip>
                  )}
                </header>
                <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                  {r.product ? (
                    <div>
                      <dt className="text-muted-foreground">Product / units</dt>
                      <dd>
                        {r.product} {r.units ? `· ${r.units}u` : ""}
                      </dd>
                    </div>
                  ) : null}
                  {r.device_settings ? (
                    <div>
                      <dt className="text-muted-foreground">Device settings</dt>
                      <dd>{r.device_settings}</dd>
                    </div>
                  ) : null}
                  {(["subjective", "objective", "assessment", "plan"] as const).map((k) =>
                    r[k] ? (
                      <div key={k}>
                        <dt className="text-muted-foreground capitalize">{k}</dt>
                        <dd>{r[k]}</dd>
                      </div>
                    ) : null,
                  )}
                </dl>
                {r.addendum ? (
                  <div className="mt-3 rounded-lg border border-dashed border-border p-3 text-xs">
                    <p className="text-muted-foreground">
                      Addendum · {r.addendum_by} · {formatDate(r.addendum_at ?? r.created_at)}
                    </p>
                    <p className="mt-1">{r.addendum}</p>
                  </div>
                ) : null}
                <NotePhotos patientId={patientId} recordId={r.id} />
                {r.signed_at && !r.addendum ? (
                  addendumFor === r.id ? (
                    <form
                      className="mt-3 space-y-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const text = String(new FormData(e.currentTarget).get("addendum") ?? "");
                        const provider =
                          providers.data?.find((p) => p.id === r.provider_id)?.name ?? "Clinician";
                        updateRecord.mutate(
                          {
                            id: r.id,
                            values: {
                              addendum: text,
                              addendum_by: provider,
                              addendum_at: new Date().toISOString(),
                            },
                          },
                          {
                            onSuccess: () => {
                              toast.success("Addendum added");
                              setAddendumFor(null);
                            },
                          },
                        );
                      }}
                    >
                      <textarea
                        name="addendum"
                        required
                        className={textareaClass}
                        placeholder="Addendum to a locked note"
                      />
                      <div className="flex gap-2">
                        <button className={primaryButton}>Save addendum</button>
                        <button
                          type="button"
                          className={ghostButton}
                          onClick={() => setAddendumFor(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button className={`${ghostButton} mt-3`} onClick={() => setAddendumFor(r.id)}>
                      <Plus className="size-3.5" /> Add addendum
                    </button>
                  )
                ) : null}
                {!r.signed_at ? (
                  <button
                    className={`${ghostButton} mt-4`}
                    onClick={() => {
                      const provider =
                        providers.data?.find((p) => p.id === r.provider_id)?.name ?? "Clinician";
                      updateRecord.mutate(
                        {
                          id: r.id,
                          values: { signed_by: provider, signed_at: new Date().toISOString() },
                        },
                        { onSuccess: () => toast.success("Note signed and locked") },
                      );
                    }}
                  >
                    <FileSignature className="size-3.5" /> Sign &amp; lock
                  </button>
                ) : null}
              </article>
            ))
          )}
        </TabsContent>

        <TabsContent value="consents" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button className={primaryButton} onClick={() => setConsentOpen(true)}>
              <Plus className="size-3.5" /> Capture consent
            </button>
            <button
              className={ghostButton}
              onClick={() => void shareLink("consent", consentTemplates.data?.[0]?.id ?? null)}
            >
              <Link2 className="size-3.5" /> Send consent link
            </button>
            <button className={ghostButton} onClick={() => void shareLink("intake")}>
              <Link2 className="size-3.5" /> Send intake link
            </button>
          </div>
          {signed.length === 0 ? (
            <EmptyState>No consents on file.</EmptyState>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {signed.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex-1 text-sm">{c.template_name}</span>
                  {c.signature_data ? (
                    <img
                      src={c.signature_data}
                      alt="Signature"
                      className="h-7 w-20 object-contain"
                    />
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {c.signature_name} · {c.signed_via}
                  </span>
                  <Chip tone="completed">{formatDate(c.signed_at)}</Chip>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            {bills.length === 0 ? (
              <div className="p-5">
                <EmptyState>No invoices for this patient.</EmptyState>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {bills.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-24 text-xs tabular-nums text-muted-foreground">
                      {i.number}
                    </span>
                    <span className="flex-1 text-xs text-muted-foreground">
                      {formatDate(i.issued_at)}
                    </span>
                    <span className="text-sm font-medium tabular-nums">{money(i.total)}</span>
                    <Chip tone={invoiceTone(i.status)}>{i.status}</Chip>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            {messages.length === 0 ? (
              <div className="p-5">
                <EmptyState>No messages sent or scheduled.</EmptyState>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {messages.map((m) => (
                  <li key={m.id} className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Chip
                        tone={
                          m.status === "Sent"
                            ? "completed"
                            : m.status === "Failed"
                              ? "overdue"
                              : "progress"
                        }
                      >
                        {m.channel} · {m.status}
                      </Chip>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(m.sent_at ?? m.scheduled_for)}
                      </span>
                    </div>
                    {m.subject ? <p className="mt-1.5 text-sm font-medium">{m.subject}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">{m.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={chartOpen} onOpenChange={setChartOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New treatment note</DialogTitle>
          </DialogHeader>
          <form
            id="new-chart"
            className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveChart(e.currentTarget);
            }}
          >
            <Field label="Service">
              <select
                name="service_name"
                required
                className={inputClass}
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">Select a service…</option>
                {services.data?.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Provider">
              <select name="provider_id" className={inputClass}>
                {providers.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Linked visit" className="sm:col-span-2">
              <select name="appointment_id" className={inputClass}>
                <option value="">None</option>
                {visits.map((v) => (
                  <option key={v.id} value={v.id}>
                    {formatDateTime(v.starts_at)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Product">
              <input
                key={`product-${serviceId}`}
                name="product"
                defaultValue={selectedService?.default_product ?? ""}
                className={inputClass}
                placeholder="Botox Cosmetic"
              />
            </Field>
            <Field label="Units">
              <input
                key={`units-${serviceId}`}
                name="units"
                type="number"
                step="0.5"
                defaultValue={selectedService?.default_units ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Device settings" className="sm:col-span-2">
              <input
                key={`device-${serviceId}`}
                name="device_settings"
                defaultValue={selectedService?.default_device_settings ?? ""}
                className={inputClass}
                placeholder="Fluence, pulse width…"
              />
            </Field>
            <Field label="Subjective" className="sm:col-span-2">
              <textarea name="subjective" className={textareaClass} />
            </Field>
            <Field label="Objective" className="sm:col-span-2">
              <textarea name="objective" className={textareaClass} />
            </Field>
            <Field label="Assessment" className="sm:col-span-2">
              <textarea name="assessment" className={textareaClass} />
            </Field>
            <Field label="Plan" className="sm:col-span-2">
              <textarea name="plan" className={textareaClass} />
            </Field>
          </form>
          <DialogFooter>
            <button type="button" className={ghostButton} onClick={() => setChartOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="new-chart"
              className={primaryButton}
              disabled={addRecord.isPending}
            >
              Save note
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Capture consent</DialogTitle>
          </DialogHeader>
          <form
            id="new-consent"
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const template = consentTemplates.data?.find(
                (t) => t.id === String(fd.get("template_id")),
              );
              addConsent.mutate(
                {
                  patient_id: patientId,
                  template_id: template?.id ?? null,
                  template_name: template?.name ?? "Consent",
                  signature_name: String(fd.get("signature_name")),
                  signature_data: signature,
                  signed_via: "In clinic",
                  signed_at: new Date().toISOString(),
                },
                {
                  onSuccess: () => {
                    toast.success("Consent recorded");
                    setConsentOpen(false);
                  },
                  onError: (err) => toast.error(err.message),
                },
              );
            }}
          >
            <Field label="Consent form">
              <select name="template_id" className={inputClass}>
                {consentTemplates.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Typed signature">
              <input
                name="signature_name"
                required
                defaultValue={patientName(patient)}
                className={inputClass}
              />
            </Field>
            <Field label="Signature">
              <SignaturePad onChange={setSignature} />
            </Field>
            <p className="text-xs text-muted-foreground">
              Signing records the patient's name, drawn signature and a timestamp against this
              consent form.
            </p>
          </form>
          <DialogFooter>
            <button type="button" className={ghostButton} onClick={() => setConsentOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="new-consent"
              className={primaryButton}
              disabled={addConsent.isPending}
            >
              Record consent
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AppointmentDetailDialog
        appointment={selectedAppointment}
        patient={patient}
        provider={providers.data?.find((p) => p.id === selectedAppointment?.provider_id)}
        room={rooms.data?.find((r) => r.id === selectedAppointment?.room_id)}
        service={services.data?.find((s) => s.id === selectedAppointment?.service_id)}
        onClose={() => setSelectedAppointment(null)}
      />
    </AppShell>
  );
}
