import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Chip, EmptyState, Panel } from "@/components/clinic/bits";
import { SellPackageDialog } from "@/components/clinic/SellPackageDialog";
import { formatDate, money, packageTone } from "@/data/clinic";
import {
  unusedValue,
  useExtendPackage,
  usePatientPackageItems,
  usePatientPackages,
  useRedeemSession,
} from "@/lib/clinic-data";

/** Prepaid packages a patient holds, with per-session redemption. */
export function PatientPackages({ patientId }: { patientId: string }) {
  const [sellOpen, setSellOpen] = useState(false);
  const packages = usePatientPackages();
  const items = usePatientPackageItems();
  const redeem = useRedeemSession();
  const extend = useExtendPackage();

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
            return (
              <li key={p.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{p.name}</p>
                  <Chip tone={packageTone(p)}>{expired ? "Expired" : p.status}</Chip>
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
                          onClick={() =>
                            redeem.mutate(
                              { pkg: p, item: i, siblings: rows },
                              {
                                onSuccess: () => toast.success("Session redeemed"),
                                onError: (e) => toast.error(e.message),
                              },
                            )
                          }
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
                        const reason = window.prompt("Reason for extending validity?");
                        if (!reason) return;
                        const next = new Date();
                        next.setDate(next.getDate() + 90);
                        extend.mutate(
                          { id: p.id, expires_at: next.toISOString().slice(0, 10), reason },
                          {
                            onSuccess: () => toast.success("Validity extended by 90 days"),
                            onError: (e) => toast.error(e.message),
                          },
                        );
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
    </Panel>
  );
}
