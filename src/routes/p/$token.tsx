import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { SignaturePad } from "@/components/clinic/SignaturePad";
import { Field, inputClass, textareaClass } from "@/components/clinic/bits";
import { primaryButton } from "@/components/clinic/AppShell";
import { getPatientLink, submitConsent, submitIntake } from "@/lib/patient-links.functions";

export const Route = createFileRoute("/p/$token")({
  head: () => ({
    meta: [
      { title: "Complete your form — Luma Aesthetics Clinic" },
      {
        name: "description",
        content:
          "Securely complete your pre-visit intake details or sign your treatment consent form before your clinic appointment.",
      },
      { property: "og:title", content: "Complete your form — Luma Aesthetics Clinic" },
      {
        property: "og:description",
        content: "Fill in your intake details or sign your consent form from your phone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PatientLinkPage,
  errorComponent: () => <Shell><p className="text-sm">This link could not be opened.</p></Shell>,
  notFoundComponent: () => <Shell><p className="text-sm">Link not found.</p></Shell>,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-5 py-12">
      {children}
    </main>
  );
}

function PatientLinkPage() {
  const { token } = useParams({ from: "/p/$token" });
  const fetchLink = useServerFn(getPatientLink);
  const intake = useServerFn(submitIntake);
  const consent = useServerFn(submitConsent);
  const [done, setDone] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  const link = useQuery({
    queryKey: ["patient_link", token],
    queryFn: () => fetchLink({ data: { token } }),
  });

  const saveIntake = useMutation({
    mutationFn: (values: Record<string, string>) => intake({ data: { token, ...values } }),
    onSuccess: () => setDone(true),
    onError: (e: Error) => toast.error(e.message),
  });
  const saveConsent = useMutation({
    mutationFn: (values: { signature_name: string }) =>
      consent({ data: { token, signature_name: values.signature_name, signature_data: signature } }),
    onSuccess: () => setDone(true),
    onError: (e: Error) => toast.error(e.message),
  });

  if (link.isLoading) return <Shell><p className="text-sm text-muted-foreground">Loading…</p></Shell>;
  const data = link.data;
  if (!data || data.status !== "ok") {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">
          {data?.status === "completed"
            ? "Already completed"
            : data?.status === "expired"
              ? "This link has expired"
              : "Link not valid"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Please contact the clinic if you still need to complete this form.
        </p>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <CheckCircle2 className="size-8 text-primary" />
        <h1 className="text-xl font-semibold">Thank you, {data.patientName}</h1>
        <p className="text-sm text-muted-foreground">
          Your details have been sent to {data.clinicName}. You can close this page.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{data.clinicName}</p>
        <h1 className="text-2xl font-semibold">
          {data.kind === "intake" ? "Pre-visit details" : "Treatment consent"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.kind === "intake"
            ? "Confirm your details so we can prepare for your visit."
            : "Please read and sign the consent form below."}
        </p>
      </header>

      {data.kind === "intake" ? (
        <form
          className="grid gap-4 rounded-xl border border-border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            saveIntake.mutate({
              email: String(fd.get("email") ?? ""),
              phone: String(fd.get("phone") ?? ""),
              birth_date: String(fd.get("birth_date") ?? ""),
              allergies: String(fd.get("allergies") ?? ""),
              notes: String(fd.get("notes") ?? ""),
            });
          }}
        >
          <Field label="Email">
            <input name="email" type="email" className={inputClass} />
          </Field>
          <Field label="Mobile number">
            <input name="phone" inputMode="tel" className={inputClass} />
          </Field>
          <Field label="Date of birth">
            <input name="birth_date" type="date" className={inputClass} />
          </Field>
          <Field label="Allergies or medications">
            <textarea name="allergies" className={textareaClass} />
          </Field>
          <Field label="Anything else we should know?">
            <textarea name="notes" className={textareaClass} />
          </Field>
          <button className={primaryButton} disabled={saveIntake.isPending}>
            {saveIntake.isPending ? "Sending…" : "Submit details"}
          </button>
        </form>
      ) : (
        <form
          className="grid gap-4 rounded-xl border border-border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            saveConsent.mutate({ signature_name: String(fd.get("signature_name") ?? "") });
          }}
        >
          <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-4 text-xs leading-relaxed">
            {data.consent?.body ?? "Consent form text unavailable."}
          </div>
          <Field label="Full name">
            <input name="signature_name" required defaultValue={data.patientName} className={inputClass} />
          </Field>
          <Field label="Signature">
            <SignaturePad onChange={setSignature} />
          </Field>
          <button className={primaryButton} disabled={saveConsent.isPending}>
            {saveConsent.isPending ? "Submitting…" : "Sign and submit"}
          </button>
        </form>
      )}
    </Shell>
  );
}
