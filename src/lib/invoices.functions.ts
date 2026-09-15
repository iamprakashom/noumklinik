import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeGstTotals, stateCode } from "@/lib/gst";

const invoiceLineSchema = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  gst_rate: z.number().nonnegative(),
  sac_code: z.string().trim().min(1).max(20),
});

export const createInvoiceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        patient_id: z.string().uuid(),
        appointment_id: z.string().uuid().nullable(),
        items: z.array(invoiceLineSchema).min(1),
        discount: z.number().nonnegative(),
        placeOfSupply: z.string().max(100).nullable(),
        notes: z.string().max(1000).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data: input, context }) => {
    const { data: clinic, error: clinicError } = await context.supabase
      .from("clinic_profile")
      .select("state, gstin")
      .limit(1)
      .maybeSingle();
    if (clinicError) throw new Error(clinicError.message);

    const clinicState = clinic?.state ?? null;
    const pos = input.placeOfSupply ?? clinicState;
    const interState = Boolean(pos && clinicState && pos !== clinicState);
    const totals = computeGstTotals(input.items, input.discount, interState);
    if (totals.total <= 0 || totals.taxable_value <= 0) {
      throw new Error("Invoice total must be greater than zero");
    }

    const { data: invoice, error } = await context.supabase
      .from("invoices")
      .insert({
        patient_id: input.patient_id,
        appointment_id: input.appointment_id,
        number: "AUTO",
        status: "Open",
        doc_type: "invoice",
        subtotal: totals.subtotal,
        discount: totals.discount,
        taxable_value: totals.taxable_value,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        tax: totals.tax,
        round_off: totals.round_off,
        total: totals.total,
        supplier_gstin: clinic?.gstin ?? null,
        place_of_supply: pos,
        place_of_supply_code: stateCode(pos),
        notes: input.notes,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: itemError } = await context.supabase.from("invoice_items").insert(
      totals.lines.map((line) => ({
        invoice_id: invoice.id,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        amount: line.amount,
        sac_code: line.sac_code,
        gst_rate: line.gst_rate,
        taxable_amount: line.taxable_amount,
        cgst: line.cgst,
        sgst: line.sgst,
        igst: line.igst,
      })),
    );
    if (itemError) {
      await context.supabase.from("invoices").delete().eq("id", invoice.id);
      throw new Error(itemError.message);
    }
    return invoice.id;
  });