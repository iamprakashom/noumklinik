import { describe, expect, it } from "bun:test";
import * as billingMath from "./billing-math";
import {
  creditByOriginalInvoice,
  invoiceBalance,
  invoiceDisplayStatus,
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
describe("payment status and credit-note turnover", () => {
  it("ignores pending and failed payments", () => {
    const { paymentEffect: effect, refundAmount: refund } = billingMath;
    expect(effect({ invoice_id: "i1", amount: 500, status: "Pending" })).toBe(0);
    expect(effect({ invoice_id: "i1", amount: 500, status: "Failed" })).toBe(0);
    expect(effect({ invoice_id: "i1", amount: -200, status: "Failed" })).toBe(0);
    expect(refund({ invoice_id: "i1", amount: -200, status: "Failed" })).toBe(0);
    expect(effect({ invoice_id: "i1", amount: 500, status: "Paid" })).toBe(500);
  });

  it("nets a credited invoice and its negative credit note to zero", () => {
    const docs = [
      { id: "i1", total: 1000, status: "Void", doc_type: "invoice" },
      { id: "c1", total: -1000, status: "Paid", doc_type: "credit_note", original_invoice_id: "i1" },
      { id: "i2", total: 300, status: "Void", doc_type: "invoice" },
      { id: "i3", total: 500, status: "Open", doc_type: "invoice" },
    ];
    const credited = billingMath.creditedInvoiceIds(docs);
    const turnover = docs
      .filter((d) => billingMath.countsTowardTurnover(d, credited))
      .reduce((s, d) => s + d.total, 0);
    expect(turnover).toBe(500);
  });

  it("derives invoice filters from the real payment balance", () => {
    const open = { id: "open", total: 1000, status: "Open", doc_type: "invoice" };
    const partial = { id: "partial", total: 1000, status: "Open", doc_type: "invoice" };
    const paid = { id: "paid", total: 1000, status: "Open", doc_type: "invoice" };
    const credit = { id: "credit", total: -1000, status: "Paid", doc_type: "credit_note" };
    const voided = { id: "void", total: 1000, status: "Void", doc_type: "invoice" };
    const settled = settledByInvoice([
      { invoice_id: "partial", amount: 250, status: "Paid" },
      { invoice_id: "paid", amount: 1000, status: "Paid" },
    ]);

    expect(invoiceDisplayStatus(open, settled, new Map())).toBe("Open");
    expect(invoiceDisplayStatus(partial, settled, new Map())).toBe("Part-paid");
    expect(invoiceDisplayStatus(paid, settled, new Map())).toBe("Paid");
    expect(invoiceDisplayStatus(credit, settled, new Map())).toBe("Credit note");
    expect(invoiceDisplayStatus(voided, settled, new Map())).toBe("Void");
  });
});
