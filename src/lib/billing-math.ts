export type BillingInvoice = {
  id: string;
  total: number | string;
  status: string;
  doc_type: string;
  original_invoice_id?: string | null;
};

export type BillingPayment = {
  invoice_id: string;
  amount: number | string;
  status: string;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function paymentEffect(payment: BillingPayment) {
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount)) return 0;
  if (amount < 0) return payment.status === "Paid" || payment.status === "Refunded" ? amount : 0;
  return payment.status === "Paid" ? amount : 0;
}

export function settledByInvoice(payments: BillingPayment[]) {
  const result = new Map<string, number>();
  for (const payment of payments) {
    result.set(
      payment.invoice_id,
      roundMoney((result.get(payment.invoice_id) ?? 0) + paymentEffect(payment)),
    );
  }
  return result;
}

export function creditByOriginalInvoice(invoices: BillingInvoice[]) {
  const result = new Map<string, number>();
  for (const invoice of invoices) {
    if (invoice.doc_type !== "credit_note" || !invoice.original_invoice_id) continue;
    result.set(
      invoice.original_invoice_id,
      roundMoney(
        (result.get(invoice.original_invoice_id) ?? 0) + Math.abs(Number(invoice.total) || 0),
      ),
    );
  }
  return result;
}

export function isReceivableInvoice(invoice: BillingInvoice) {
  return invoice.doc_type === "invoice" && invoice.status !== "Void";
}

export function invoiceBalance(
  invoice: BillingInvoice,
  settled: ReadonlyMap<string, number>,
  credits: ReadonlyMap<string, number>,
) {
  if (!isReceivableInvoice(invoice)) return 0;
  return Math.max(
    0,
    roundMoney(
      Number(invoice.total) -
        (settled.get(invoice.id) ?? 0) -
        (credits.get(invoice.id) ?? 0),
    ),
  );
}

export function refundAmount(payment: BillingPayment) {
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount)) return 0;
  if (amount < 0) return payment.status === "Paid" || payment.status === "Refunded" ? -amount : 0;
  return payment.status === "Refunded" ? amount : 0;
}

/** Invoices that were cancelled by issuing a credit note (not simply voided). */
export function creditedInvoiceIds(invoices: Pick<BillingInvoice, "doc_type" | "original_invoice_id">[]) {
  const ids = new Set<string>();
  for (const invoice of invoices) {
    if (invoice.doc_type === "credit_note" && invoice.original_invoice_id) {
      ids.add(invoice.original_invoice_id);
    }
  }
  return ids;
}

/**
 * Whether a document belongs in turnover / GST working. Credit notes are stored
 * with negative values and count as-is. An invoice reversed by a credit note
 * still counts at its original value so the pair nets to zero; an invoice voided
 * without a credit note is excluded.
 */
export function countsTowardTurnover(
  invoice: Pick<BillingInvoice, "id" | "status" | "doc_type">,
  credited: ReadonlySet<string>,
) {
  if (invoice.doc_type === "credit_note") return true;
  return invoice.status !== "Void" || credited.has(invoice.id);
}