import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Chip, EmptyState, Panel } from "@/components/clinic/bits";
import { SellPackageDialog } from "@/components/clinic/SellPackageDialog";
import { formatDate, money, packageTone, type PatientPackage, type PatientPackageItem } from "@/data/clinic";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, inputClass } from "@/components/clinic/bits";
import {
  unusedValue,
  useExtendPackage,
  useAppointments,
  usePatientPackageItems,
  usePatientPackages,
  useProviders,
  useRedeemSession,
} from "@/lib/clinic-data";

/** Prepaid packages a patient holds, with per-session redemption. */
export function PatientPackages({ patientId }: { patientId: string }) {
  const [sellOpen, setSellOpen] = useState(false);
  const [redeeming, setRedeeming] = useState<{ pkg: PatientPackage; item: PatientPackageItem; siblings: PatientPackageItem[] } | null>(null);
  const [providerId, setProviderId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [extending, setExtending] = useState<PatientPackage | null>(null);
  const [extensionDate, setExtensionDate] = useState("");
  const [extensionReason, setExtensionReason] = useState("");
  const packages = usePatientPackages();
  const items = usePatientPackageItems();
  const redeem = useRedeemSession();
  const extend = useExtendPackage();
  const providers = useProviders();
  const appointments = useAppointments();

  const mine = (packages.data ?? []).filter((p) => p.patient_id === patientId);

  return (
    <Panel
      title="Packages"
      action={
        <button className={primaryButton} onClick={() => setSellOpen(true)}>
          <Plus className="size-3.5" /> Sell package
        </button>
      }
    >
      {mine.length === 0 ? (
        <EmptyState>No prepaid packages for this patient.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {mine.map((p) => {
            const rows = (items.data ?? []).filter((i) => i.patient_package_id === p.id);
            const expired = new Date(p.expires_at) < new Date();
            const daysLeft = Math.ceil((new Date(p.expires_at).getTime() - Date.now()) / 86_400_000);
            return (
              <li key={p.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{p.name}</p>
                  <Chip tone={packageTone(p)}>{expired ? "Expired" : p.status}</Chip>
                  {!expired && daysLeft <= 30 ? <Chip tone="overdue">Expires in {daysLeft} days</Chip> : null}
                  <span className="ml-auto text-xs text-muted-foreground">
                    Paid {money(p.price_paid)} · expires {formatDate(p.expires_at)}
                  </span>
                </div>

                <ul className="mt-3 grid gap-2">
                  {rows.map((i) => {
                    const left = Math.max(0, i.sessions_total - i.sessions_used);
                    return (
                      <li key={i.id} className="flex items-center gap-3 text-sm">
                        <span className="min-w-0 flex-1 truncate">{i.service_name}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {i.sessions_used}/{i.sessions_total} used · {left} left
                        </span>
                        <button
                          className={ghostButton}
                          disabled={left === 0 || expired || redeem.isPending}
                          onClick={() => setRedeeming({ pkg: p, item: i, siblings: rows })}
                        >
                          Redeem 1 session
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-3 flex items-center gap-3 border-t border-border pt-2 text-xs text-muted-foreground">
                  <span>Unused balance {money(unusedValue(rows))}</span>
                  {p.extension_reason ? <span>· extended: {p.extension_reason}</span> : null}
                  {expired ? (
                    <button
                      className={`${ghostButton} ml-auto`}
                      onClick={() => {
                        const next = new Date();
                        next.setDate(next.getDate() + 90);
                        setExtensionDate(next.toISOString().slice(0, 10));
                        setExtensionReason("");
                        setExtending(p);
                      }}
                    >
                      Extend 90 days
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <SellPackageDialog open={sellOpen} onOpenChange={setSellOpen} patientId={patientId} />
      <Dialog open={redeeming !== null} onOpenChange={(open) => { if (!open) setRedeeming(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Redeem package session</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">{redeeming?.item.service_name}{redeeming?.item.gap_days ? ` · next session due in ${redeeming.item.gap_days} days` : ""}</p>
            <Field label="Doctor / provider"><select required className={inputClass} value={providerId} onChange={(e) => setProviderId(e.target.value)}><option value="">Select provider…</option>{providers.data?.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Appointment (optional)"><select className={inputClass} value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)}><option value="">No linked appointment</option>{appointments.data?.filter((a) => a.patient_id === patientId).map((a) => <option key={a.id} value={a.id}>{formatDate(a.starts_at)} · {a.status}</option>)}</select></Field>
          </div>
          <DialogFooter><button type="button" className={ghostButton} onClick={() => setRedeeming(null)}>Cancel</button><button type="button" className={primaryButton} disabled={!providerId || redeem.isPending} onClick={() => { if (!redeeming) return; redeem.mutate({ ...redeeming, provider_id: providerId, appointment_id: appointmentId || null }, { onSuccess: () => { toast.success(redeeming.item.gap_days ? `Session redeemed — next follow-up set for ${redeeming.item.gap_days} days` : "Session redeemed"); setRedeeming(null); setProviderId(""); setAppointmentId(""); }, onError: (e) => toast.error(e.message) }); }}>Redeem session</button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={extending !== null} onOpenChange={(open) => { if (!open) setExtending(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Extend package validity</DialogTitle></DialogHeader>
          <div className="grid gap-4"><Field label="New expiry date"><input type="date" className={inputClass} min={new Date().toISOString().slice(0, 10)} value={extensionDate} onChange={(e) => setExtensionDate(e.target.value)} /></Field><Field label="Reason"><input className={inputClass} value={extensionReason} onChange={(e) => setExtensionReason(e.target.value)} placeholder="Clinical delay, illness, clinic closure…" /></Field></div>
          <DialogFooter><button type="button" className={ghostButton} onClick={() => setExtending(null)}>Cancel</button><button type="button" className={primaryButton} disabled={!extensionDate || !extensionReason.trim() || extend.isPending} onClick={() => { if (!extending) return; extend.mutate({ id: extending.id, expires_at: extensionDate, reason: extensionReason.trim() }, { onSuccess: () => { toast.success("Package validity extended"); setExtending(null); }, onError: (e) => toast.error(e.message) }); }}>Save extension</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
