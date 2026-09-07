import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { SignaturePad } from "@/components/clinic/SignaturePad";
import { Field, inputClass, textareaClass } from "@/components/clinic/bits";
import { primaryButton } from "@/components/clinic/AppShell";
import {
  confirmAppointment,
  getPatientLink,
  markReviewClicked,
  requestReschedule,
  submitConsent,
  submitFeedback,
  submitIntake,
} from "@/lib/patient-links.functions";
import { toLocalInputValue } from "@/data/clinic";
import { TimePickerSelector } from "@/components/clinic/TimePickerSelector";

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
  errorComponent: () => (
    <Shell>
      <p className="text-sm">This link could not be opened.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="text-sm">Link not found.</p>
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

function PatientLinkPage() {
  const { token } = useParams({ from: "/p/$token" });
  const fetchLink = useServerFn(getPatientLink);
  const intake = useServerFn(submitIntake);
  const consent = useServerFn(submitConsent);
  const doConfirm = useServerFn(confirmAppointment);
  const doReschedule = useServerFn(requestReschedule);
  const doFeedback = useServerFn(submitFeedback);
  const noteReviewClick = useServerFn(markReviewClicked);
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [reviewLink, setReviewLink] = useState<string | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [rating, setRating] = useState(0);

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
      consent({
        data: { token, signature_name: values.signature_name, signature_data: signature },
      }),
    onSuccess: () => setDone(true),
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmMut = useMutation({
    mutationFn: () => doConfirm({ data: { token } }),
    onSuccess: () => {
      setDoneMessage("Your appointment is confirmed. See you at the clinic.");
      setDone(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rescheduleMut = useMutation({
    mutationFn: (values: { preferred_at: string; notes: string }) =>
      doReschedule({ data: { token, ...values } }),
    onSuccess: () => {
      setDoneMessage("We have your new preferred time — the clinic will call to confirm.");
      setDone(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const feedbackMut = useMutation({
    mutationFn: (values: { rating: number; comment: string }) =>
      doFeedback({ data: { token, rating: values.rating, comment: values.comment || null } }),
    onSuccess: (res) => {
      setReviewLink(res.reviewLink ?? null);
      setDoneMessage(
        res.happy
          ? "Thank you — we're glad it went well."
          : "Thank you for telling us. Our team will reach out to put this right.",
      );
      setDone(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (link.isLoading)
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
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
          {doneMessage ??
            `Your details have been sent to ${data.clinicName}. You can close this page.`}
        </p>
        {reviewLink ? (
          <a
            href={reviewLink}
            target="_blank"
            rel="noopener noreferrer"
            className={primaryButton}
            onClick={() => void noteReviewClick({ data: { token } })}
          >
            Leave a Google review
          </a>
        ) : null}
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{data.clinicName}</p>
        <h1 className="text-2xl font-semibold">
          {data.kind === "intake"
            ? "Pre-visit details"
            : data.kind === "consent"
              ? "Treatment consent"
              : data.kind === "feedback"
                ? "How was your visit?"
                : "Your appointment"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.kind === "intake"
            ? "Confirm your details so we can prepare for your visit."
            : data.kind === "consent"
              ? "Please read and sign the consent form below."
              : data.kind === "feedback"
                ? `Hello ${data.patientName}, a quick rating helps us look after you better.`
                : `Hello ${data.patientName}, please confirm you can make it.`}
        </p>
      </header>

      {data.kind === "feedback" ? (
        <form
          className="grid gap-5 rounded-xl border border-border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (rating === 0) {
              toast.error("Please pick a rating first");
              return;
            }
            const fd = new FormData(e.currentTarget);
            feedbackMut.mutate({ rating, comment: String(fd.get("comment") ?? "") });
          }}
        >
          <div
            role="radiogroup"
            aria-label="Rate your visit from 1 to 5"
            className="flex items-center justify-between gap-2"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onClick={() => setRating(n)}
                className={`flex size-12 items-center justify-center rounded-full border text-lg transition-colors ${
                  rating >= n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary"
                }`}
              >
                ★
              </button>
            ))}
          </div>
          <p className="-mt-3 text-center text-xs text-muted-foreground">
            {rating === 0
              ? "Tap a star"
              : rating >= 4
                ? "Glad to hear it!"
                : "Sorry to hear that — tell us more."}
          </p>
          <Field
            label={rating > 0 && rating < 4 ? "What went wrong?" : "Anything to add? (optional)"}
          >
            <textarea name="comment" className={textareaClass} />
          </Field>
          <button className={primaryButton} disabled={feedbackMut.isPending}>
            {feedbackMut.isPending ? "Sending…" : "Send feedback"}
          </button>
        </form>
      ) : data.kind === "appointment" ? (
        <div className="grid gap-4 rounded-xl border border-border bg-card p-5">
          <div className="rounded-lg border border-border bg-background p-4 text-sm">
            <p className="font-medium">
              {data.appointment
                ? new Date(data.appointment.starts_at).toLocaleString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Appointment details unavailable"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {[data.appointment?.service, data.appointment?.provider]
                .filter(Boolean)
                .join(" · ") || "At the clinic"}
            </p>
          </div>

          {showReschedule ? (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const local = String(fd.get("preferred_at") ?? "");
                const iso = local ? new Date(local).toISOString() : "";
                rescheduleMut.mutate({
                  preferred_at: iso,
                  notes: String(fd.get("notes") ?? ""),
                });
              }}
            >
              <Field as="div" label="New preferred date and time">
                <TimePickerSelector name="preferred_at" required clinic={data} />
              </Field>
              <Field label="Reason (optional)">
                <textarea name="notes" className={textareaClass} />
              </Field>
              <button className={primaryButton} disabled={rescheduleMut.isPending}>
                {rescheduleMut.isPending ? "Sending…" : "Request new time"}
              </button>
              <button
                type="button"
                className="text-xs text-muted-foreground underline"
                onClick={() => setShowReschedule(false)}
              >
                Back
              </button>
            </form>
          ) : (
            <div className="grid gap-2">
              <button
                className={primaryButton}
                disabled={confirmMut.isPending}
                onClick={() => confirmMut.mutate()}
              >
                {confirmMut.isPending ? "Confirming…" : "Yes, I will be there"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-2 text-sm"
                onClick={() => setShowReschedule(true)}
              >
                I need a different time
              </button>
            </div>
          )}
        </div>
      ) : data.kind === "intake" ? (
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
            <input
              name="birth_date"
              type="date"
              max={toLocalInputValue(new Date()).slice(0, 10)}
              className={inputClass}
            />
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
            <input
              name="signature_name"
              required
              defaultValue={data.patientName}
              className={inputClass}
            />
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
