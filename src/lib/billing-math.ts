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
  if (amount < 0) return amount;
  if (payment.status === "Refunded") return 0;
  return amount;
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
  return amount < 0 || payment.status === "Refunded" ? Math.abs(amount) : 0;
}