import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeGstTotals, stateCode, type GstLine } from "@/lib/gst";
import type {
  AddonDiscountRule,
  Appointment,
  ClinicProfile,
  AutomationRule,
  ConsentTemplate,
  Invoice,
  InvoiceItem,
  Lead,
  MessageTemplate,
  OutboxMessage,
  Patient,
  PatientConsent,
  PaymentLink,
  Package,
  PackageItem,
  PackageRedemption,
  PatientPackage,
  PatientPackageItem,
  Payment,
  Provider,
  Room,
  Service,
  ServiceAddon,
  TreatmentRecord,
} from "@/data/clinic";

async function list<T>(table: string, orderBy: string, ascending = true): Promise<T[]> {
  const { data, error } = await supabase
    .from(table as never)
    .select("*")
    .order(orderBy, { ascending });
  if (error) throw error;
  return (data ?? []) as T[];
}

function useList<T>(key: string, table: string, orderBy: string, ascending = true) {
  return useQuery({ queryKey: [key], queryFn: () => list<T>(table, orderBy, ascending) });
}

export const usePatients = () => useList<Patient>("patients", "patients", "created_at", false);
export const useProviders = () => useList<Provider>("providers", "providers", "name");
export const useRooms = () => useList<Room>("rooms", "rooms", "name");
export const useServices = () => useList<Service>("services", "services", "name");
export const useAppointments = () =>
  useList<Appointment>("appointments", "appointments", "starts_at");
export const useLeads = () => useList<Lead>("leads", "leads", "created_at", false);
export const useTreatmentRecords = () =>
  useList<TreatmentRecord>("treatment_records", "treatment_records", "created_at", false);
export const useConsentTemplates = () =>
  useList<ConsentTemplate>("consent_templates", "consent_templates", "name");
export const usePatientConsents = () =>
  useList<PatientConsent>("patient_consents", "patient_consents", "signed_at", false);
export const useInvoices = () => useList<Invoice>("invoices", "invoices", "created_at", false);
export const useInvoiceItems = () =>
  useList<InvoiceItem>("invoice_items", "invoice_items", "created_at");
export const usePayments = () => useList<Payment>("payments", "payments", "paid_at", false);
export const useMessageTemplates = () =>
  useList<MessageTemplate>("message_templates", "message_templates", "name");
export const useAutomationRules = () =>
  useList<AutomationRule>("automation_rules", "automation_rules", "created_at");
export const useOutbox = () =>
  useList<OutboxMessage>("outbox", "messages_outbox", "scheduled_for", false);
export const useServiceAddons = () =>
  useList<ServiceAddon>("service_addons", "service_addons", "created_at");
export const useAddonDiscountRules = () =>
  useList<AddonDiscountRule>("addon_discount_rules", "addon_discount_rules", "created_at");
export const usePaymentLinks = () =>
  useList<PaymentLink>("payment_links", "payment_links", "created_at", false);

const RELATED: Record<string, string[]> = {
  patients: ["patients"],
  appointments: ["appointments", "outbox"],
  leads: ["leads"],
  treatment_records: ["treatment_records"],
  patient_consents: ["patient_consents"],
  consent_templates: ["consent_templates"],
  invoices: ["invoices", "invoice_items", "payments"],
  invoice_items: ["invoices", "invoice_items"],
  payments: ["invoices", "payments"],
  message_templates: ["message_templates"],
  automation_rules: ["automation_rules"],
  messages_outbox: ["outbox"],
  services: ["services"],
  providers: ["providers"],
  rooms: ["rooms"],
  service_addons: ["service_addons"],
  addon_discount_rules: ["addon_discount_rules"],
  payment_links: ["payment_links", "invoices", "payments"],
  packages: ["packages", "package_items"],
  package_items: ["packages", "package_items"],
  patient_packages: ["patient_packages", "patient_package_items"],
  patient_package_items: ["patient_packages", "patient_package_items"],
};

function useInvalidate() {
  const qc = useQueryClient();
  return (table: string) => {
    for (const key of RELATED[table] ?? [table]) {
      void qc.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useInsert<T extends Record<string, unknown>>(table: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (values: T | T[]) => {
      const { data, error } = await supabase
        .from(table as never)
        .insert(values as never)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown[];
    },
    onSuccess: () => invalidate(table),
  });
}

export function useUpdate<T extends Record<string, unknown>>(table: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: T }) => {
      const { error } = await supabase
        .from(table as never)
        .update(values as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(table),
  });
}

export function useRemove(table: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(table),
  });
}

export function useClinicProfile() {
  return useQuery({
    queryKey: ["clinic_profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinic_profile").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as ClinicProfile | null;
    },
  });
}

export function useUpdateClinicProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("clinic_profile")
        .update(values as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["clinic_profile"] }),
  });
}

/** Creates a GST invoice with its line-level tax breakup in one go. */
export function useCreateInvoice() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: {
      patient_id: string;
      appointment_id?: string | null;
      items: GstLine[];
      discount: number;
      clinic: ClinicProfile | null;
      placeOfSupply: string | null;
      notes?: string | null;
    }) => {
      const clinicState = input.clinic?.state ?? null;
      const pos = input.placeOfSupply ?? clinicState;
      const interState = Boolean(pos && clinicState && pos !== clinicState);
      const t = computeGstTotals(input.items, input.discount, interState);

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          patient_id: input.patient_id,
          appointment_id: input.appointment_id ?? null,
          number: "AUTO",
          status: "Open",
          doc_type: "invoice",
          subtotal: t.subtotal,
          discount: t.discount,
          taxable_value: t.taxable_value,
          cgst: t.cgst,
          sgst: t.sgst,
          igst: t.igst,
          tax: t.tax,
          round_off: t.round_off,
          total: t.total,
          supplier_gstin: input.clinic?.gstin ?? null,
          place_of_supply: pos,
          place_of_supply_code: stateCode(pos),
          notes: input.notes ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: itemErr } = await supabase.from("invoice_items").insert(
        t.lines.map((i) => ({
          invoice_id: data.id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          amount: i.amount,
          sac_code: i.sac_code,
          gst_rate: i.gst_rate,
          taxable_amount: i.taxable_amount,
          cgst: i.cgst,
          sgst: i.sgst,
          igst: i.igst,
        })),
      );
      if (itemErr) throw itemErr;
      return data.id;
    },
    onSuccess: () => invalidate("invoices"),
  });
}

/** Issues a credit note that reverses an invoice, keeping the number series intact. */
export function useCreateCreditNote() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      invoice,
      items,
      reason,
    }: {
      invoice: Invoice;
      items: InvoiceItem[];
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          patient_id: invoice.patient_id,
          appointment_id: invoice.appointment_id,
          number: "AUTO",
          status: "Paid",
          doc_type: "credit_note",
          original_invoice_id: invoice.id,
          subtotal: -Number(invoice.subtotal),
          discount: -Number(invoice.discount),
          taxable_value: -Number(invoice.taxable_value),
          cgst: -Number(invoice.cgst),
          sgst: -Number(invoice.sgst),
          igst: -Number(invoice.igst),
          tax: -Number(invoice.tax),
          round_off: -Number(invoice.round_off),
          total: -Number(invoice.total),
          supplier_gstin: invoice.supplier_gstin,
          place_of_supply: invoice.place_of_supply,
          place_of_supply_code: invoice.place_of_supply_code,
          notes: reason,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (items.length) {
        const { error: itemErr } = await supabase.from("invoice_items").insert(
          items.map((i) => ({
            invoice_id: data.id,
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
            amount: -Number(i.amount),
            sac_code: i.sac_code,
            gst_rate: i.gst_rate,
            taxable_amount: -Number(i.taxable_amount),
            cgst: -Number(i.cgst),
            sgst: -Number(i.sgst),
            igst: -Number(i.igst),
          })),
        );
        if (itemErr) throw itemErr;
      }
      await supabase.from("invoices").update({ status: "Void" }).eq("id", invoice.id);
      return data.id;
    },
    onSuccess: () => invalidate("invoices"),
  });
}

/** Converts a lead into a patient record and marks the lead converted. */
export function useConvertLead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (lead: Lead) => {
      const [first, ...rest] = lead.full_name.split(" ");
      const { data, error } = await supabase
        .from("patients")
        .insert({
          first_name: first ?? lead.full_name,
          last_name: rest.join(" ") || "—",
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          notes: lead.notes,
          tags: lead.interest ? [lead.interest] : [],
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: leadErr } = await supabase
        .from("leads")
        .update({ stage: "Converted", converted_patient_id: data.id })
        .eq("id", lead.id);
      if (leadErr) throw leadErr;
      return data.id;
    },
    onSuccess: () => {
      invalidate("leads");
      invalidate("patients");
    },
  });
}

/* ---------------------------------- Packages --------------------------------- */

export const usePackages = () => useList<Package>("packages", "packages", "name");
export const usePackageItems = () =>
  useList<PackageItem>("package_items", "package_items", "created_at");
export const usePatientPackages = () =>
  useList<PatientPackage>("patient_packages", "patient_packages", "created_at", false);
export const usePatientPackageItems = () =>
  useList<PatientPackageItem>("patient_package_items", "patient_package_items", "created_at");
export const usePackageRedemptions = () =>
  useList<PackageRedemption>("package_redemptions", "package_redemptions", "redeemed_at", false);

/** Sells a package: raises the GST invoice and opens the patient's prepaid balance. */
export function useSellPackage() {
  const qc = useQueryClient();
  const createInvoice = useCreateInvoice();
  return useMutation({
    mutationFn: async (input: {
      patient_id: string;
      pkg: Package;
      lines: { service_id: string | null; service_name: string; sessions: number; list_price: number }[];
      price: number;
      gst_rate: number;
      sac_code: string;
      clinic: ClinicProfile | null;
      placeOfSupply: string | null;
    }) => {
      const invoiceId = await createInvoice.mutateAsync({
        patient_id: input.patient_id,
        items: [
          {
            description: `Package — ${input.pkg.name}`,
            quantity: 1,
            unit_price: input.price,
            gst_rate: input.gst_rate,
            sac_code: input.sac_code,
          },
        ],
        discount: 0,
        clinic: input.clinic,
        placeOfSupply: input.placeOfSupply,
        notes: `Prepaid package sale · valid ${input.pkg.validity_days} days`,
      });

      const expires = new Date();
      expires.setDate(expires.getDate() + input.pkg.validity_days);

      const { data, error } = await supabase
        .from("patient_packages")
        .insert({
          patient_id: input.patient_id,
          package_id: input.pkg.id,
          invoice_id: invoiceId,
          name: input.pkg.name,
          price_paid: input.price,
          expires_at: expires.toISOString().slice(0, 10),
          status: "Active",
        })
        .select("id")
        .single();
      if (error) throw error;

      const listTotal = input.lines.reduce((s, l) => s + l.list_price * l.sessions, 0) || 1;
      const { error: itemErr } = await supabase.from("patient_package_items").insert(
        input.lines.map((l) => ({
          patient_package_id: data.id,
          service_id: l.service_id,
          service_name: l.service_name,
          sessions_total: l.sessions,
          sessions_used: 0,
          unit_value: Math.round((l.list_price / listTotal) * input.price),
        })),
      );
      if (itemErr) throw itemErr;
      return data.id;
    },
    onSuccess: () => {
      for (const k of ["patient_packages", "patient_package_items", "invoices", "invoice_items"])
        void qc.invalidateQueries({ queryKey: [k] });
    },
  });
}

/** Deducts one session from a patient's package and records the recognised revenue. */
export function useRedeemSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      pkg: PatientPackage;
      item: PatientPackageItem;
      siblings: PatientPackageItem[];
      appointment_id?: string | null;
      provider_id?: string | null;
    }) => {
      if (new Date(input.pkg.expires_at) < new Date()) throw new Error("This package has expired");
      if (input.item.sessions_used >= input.item.sessions_total)
        throw new Error("No sessions left on this treatment");

      const { error } = await supabase.from("package_redemptions").insert({
        patient_package_id: input.pkg.id,
        patient_package_item_id: input.item.id,
        patient_id: input.pkg.patient_id,
        appointment_id: input.appointment_id ?? null,
        provider_id: input.provider_id ?? null,
        service_name: input.item.service_name,
        value_recognised: Number(input.item.unit_value),
      });
      if (error) throw error;

      const { error: upErr } = await supabase
        .from("patient_package_items")
        .update({ sessions_used: input.item.sessions_used + 1 })
        .eq("id", input.item.id);
      if (upErr) throw upErr;

      const allDone = input.siblings.every((s) =>
        s.id === input.item.id
          ? s.sessions_used + 1 >= s.sessions_total
          : s.sessions_used >= s.sessions_total,
      );
      if (allDone) {
        await supabase.from("patient_packages").update({ status: "Completed" }).eq("id", input.pkg.id);
      }
    },
    onSuccess: () => {
      for (const k of ["patient_packages", "patient_package_items", "package_redemptions"])
        void qc.invalidateQueries({ queryKey: [k] });
    },
  });
}

/** Extends a package's validity with a recorded reason. */
export function useExtendPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, expires_at, reason }: { id: string; expires_at: string; reason: string }) => {
      const { error } = await supabase
        .from("patient_packages")
        .update({ expires_at, extension_reason: reason, status: "Active" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["patient_packages"] }),
  });
}

/** Unused prepaid value left on a package. */
export function unusedValue(items: PatientPackageItem[]) {
  return items.reduce(
    (s, i) => s + Math.max(0, i.sessions_total - i.sessions_used) * Number(i.unit_value),
    0,
  );
}
