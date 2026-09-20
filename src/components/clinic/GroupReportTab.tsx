import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EmptyState, Field, Panel, StatCard, inputClass } from "@/components/clinic/bits";
import { money } from "@/data/clinic";
import { listBranches } from "@/lib/branches.functions";
import { getGroupPerformance } from "@/lib/org-reports.functions";

/** True when this user owns a group with more than one branch. */
export function useGroupAccess() {
  const fetchBranches = useServerFn(listBranches);
  const query = useQuery({ queryKey: ["branch-directory"], queryFn: () => fetchBranches() });
  return Boolean(query.data?.isOwner) && (query.data?.branches.length ?? 0) > 1;
}

const monthStart = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

/** Side-by-side money and footfall comparison for every branch in the group. */
export function GroupReportTab() {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const fetchGroup = useServerFn(getGroupPerformance);
  const group = useQuery({
    queryKey: ["group-performance", from, to],
    queryFn: () => fetchGroup({ data: { from, to } }),
  });

  const rows = group.data?.branches ?? [];
  const total = rows.reduce(
    (acc, r) => ({
      collected: acc.collected + r.collected,
      outstanding: acc.outstanding + r.outstanding,
      appointments: acc.appointments + r.appointments,
    }),
    { collected: 0, outstanding: 0, appointments: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="From" className="w-44">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="To" className="w-44">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Group collected" value={money(total.collected)} />
        <StatCard label="Group outstanding" value={money(total.outstanding)} />
        <StatCard label="Visits" value={String(total.appointments)} />
      </div>

      <Panel title="Branch comparison">
        {group.isPending ? (
          <EmptyState>Loading branch figures…</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState>No branch activity in this period.</EmptyState>
        ) : (
          <div className="no-scrollbar overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Branch</th>
                  <th className="py-2 pr-3 text-right font-medium">Billed</th>
                  <th className="py-2 pr-3 text-right font-medium">Collected</th>
                  <th className="py-2 pr-3 text-right font-medium">Refunds</th>
                  <th className="py-2 pr-3 text-right font-medium">Outstanding</th>
                  <th className="py-2 text-right font-medium">Visits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.clinicId}>
                    <td className="py-2 pr-3">
                      {r.name}
                      {r.branchCode ? (
                        <span className="ml-1 text-xs text-muted-foreground">{r.branchCode}</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{money(r.invoiced)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{money(r.collected)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{money(r.refunded)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{money(r.outstanding)}</td>
                    <td className="py-2 text-right tabular-nums">{r.appointments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
