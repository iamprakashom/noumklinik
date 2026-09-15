import { describe, expect, it } from "bun:test";
import {
  creditByOriginalInvoice,
  invoiceBalance,
  paymentEffect,
  refundAmount,
  settledByInvoice,
} from "@/lib/billing-math";

describe("billing settlement rules", () => {
  it("reduces a balance by part payments", () => {
    const payments = [{ invoice_id: "i1", amount: 400, status: "Paid" }];
    expect(invoiceBalance({ id: "i1", total: 1000, status: "Open", doc_type: "invoice" }, settledByInvoice(payments), new Map())).toBe(600);
  });

  it("does not count a refunded payment as received", () => {
    const payment = { invoice_id: "i1", amount: 500, status: "Refunded" };
    expect(paymentEffect(payment)).toBe(0);
    expect(refundAmount(payment)).toBe(500);
  });

  it("uses negative payments as refunds that reopen the balance", () => {
    const payments = [
      { invoice_id: "i1", amount: 1000, status: "Paid" },
      { invoice_id: "i1", amount: -250, status: "Paid" },
    ];
    expect(invoiceBalance({ id: "i1", total: 1000, status: "Open", doc_type: "invoice" }, settledByInvoice(payments), new Map())).toBe(250);
  });

  it("offsets the original invoice with its credit note", () => {
    const invoices = [
      { id: "i1", total: 1000, status: "Open", doc_type: "invoice" },
      { id: "c1", total: -1000, status: "Paid", doc_type: "credit_note", original_invoice_id: "i1" },
    ];
    expect(invoiceBalance(invoices[0]!, new Map(), creditByOriginalInvoice(invoices))).toBe(0);
  });

  it("never reports a void invoice as due", () => {
    expect(invoiceBalance({ id: "i1", total: 1000, status: "Void", doc_type: "invoice" }, new Map(), new Map())).toBe(0);
  });
});