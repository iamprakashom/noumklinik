import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ghostButton, primaryButton } from "@/components/clinic/AppShell";
import { Field, inputClass } from "@/components/clinic/bits";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { money, patientName } from "@/data/clinic";
import { INDIAN_STATES } from "@/lib/gst";
import {
  useClinicProfile,
  usePackageItems,
  usePackages,
  usePatients,
  useSellPackage,
  useServices,
} from "@/lib/clinic-data";

/** Sells a prepaid package: one GST invoice plus the patient's session balance. */
export function SellPackageDialog({
  open,
  onOpenChange,
  patientId: fixedPatient,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patientId?: string;
}) {
  const [patientId, setPatientId] = useState(fixedPatient ?? "");
  const [packageId, setPackageId] = useState("");
  const [price, setPrice] = useState(0);
  const [pos, setPos] = useState("");

  const packages = usePackages();
  const packageItems = usePackageItems();
  const services = useServices();
  const patients = usePatients();
  const clinic = useClinicProfile();
  const sell = useSellPackage();

  const pkg = packages.data?.find((p) => p.id === packageId) ?? null;
  const selectedPatient = patients.data?.find((p) => p.id === (fixedPatient ?? patientId)) ?? null;
  const placeOfSupply = pos || selectedPatient?.state || clinic.data?.state || "";

  const lines = useMemo(() => {
    if (!pkg) return [];
    return (packageItems.data ?? [])
      .filter((i) => i.package_id === pkg.id)
      .map((i) => {
        const s = services.data?.find((x) => x.id === i.service_id);
        return {
          service_id: i.service_id,
          service_name: s?.name ?? "Service",
          sessions: i.sessions,
          list_price: Number(s?.price ?? 0),
          gst_rate: Number(s?.gst_rate ?? 18),
          sac_code: s?.sac_code ?? "999722",
        };
      });
  }, [pkg, packageItems.data, services.data]);

  const listValue = lines.reduce((s, l) => s + l.list_price * l.sessions, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sell package</DialogTitle>
        </DialogHeader>
        <form
          id="sell-package"
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const target = fixedPatient ?? patientId;
            if (!pkg || !target) return;
            sell.mutate(
              {
                patient_id: target,
                pkg,
                lines: lines.map((l) => ({
                  service_id: l.service_id,
                  service_name: l.service_name,
                  sessions: l.sessions,
                  list_price: l.list_price,
                })),
                price,
                gst_rate: lines[0]?.gst_rate ?? 18,
                sac_code: lines[0]?.sac_code ?? "999722",
                clinic: clinic.data ?? null,
                placeOfSupply: placeOfSupply || null,
              },
              {
                onSuccess: () => {
                  toast.success("Package sold — invoice raised and balance opened");
                  onOpenChange(false);
                  setPackageId("");
                  setPrice(0);
                },
                onError: (err) => toast.error(err.message),
              },
            );
          }}
        >
          {fixedPatient ? null : (
            <Field label="Patient">
              <select
                required
                className={inputClass}
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
              >
                <option value="">Select patient…</option>
                {patients.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {patientName(p)}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Package">
            <select
              required
              className={inputClass}
              value={packageId}
              onChange={(e) => {
                setPackageId(e.target.value);
                const p = packages.data?.find((x) => x.id === e.target.value);
                setPrice(Number(p?.price ?? 0));
              }}
            >
              <option value="">Select package…</option>
              {packages.data
                ?.filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {money(p.price)}
                  </option>
                ))}
            </select>
          </Field>

          {pkg ? (
            <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs">
              <ul className="grid gap-1">
                {lines.map((l) => (
                  <li key={l.service_name} className="flex justify-between">
                    <span>
                      {l.sessions} × {l.service_name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {money(l.list_price * l.sessions)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-border pt-2 text-muted-foreground">
                List value {money(listValue)} · valid {pkg.validity_days} days ·{" "}
                {pkg.refundable ? "unused refundable" : "non-refundable"}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price charged (₹, GST inclusive of line rate)">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </Field>
            <Field label="Place of supply">
              <select
                className={inputClass}
                value={placeOfSupply}
                onChange={(e) => setPos(e.target.value)}
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </form>
        <DialogFooter>
          <button type="button" className={ghostButton} onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            type="submit"
            form="sell-package"
            className={primaryButton}
            disabled={sell.isPending || !pkg}
          >
            Sell package
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
