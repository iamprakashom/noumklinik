import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Appointment,
  AutomationRule,
  ConsentTemplate,
  Invoice,
  InvoiceItem,
  Lead,
  MessageTemplate,
  OutboxMessage,
  Patient,
  PatientConsent,
  Payment,
  Provider,
  Room,
  Service,
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

/** Creates an invoice with its line items in one go. */
export function useCreateInvoice() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: {
      patient_id: string;
      appointment_id?: string | null;
      items: { description: string; quantity: number; unit_price: number }[];
      discount: number;
      taxRate: number;
    }) => {
      const subtotal = input.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const taxable = Math.max(subtotal - input.discount, 0);
      const tax = Math.round(taxable * input.taxRate) / 100;
      const total = taxable + tax;
      const number = `INV-${Date.now().toString().slice(-6)}`;
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          patient_id: input.patient_id,
          appointment_id: input.appointment_id ?? null,
          number,
          status: "Open",
          subtotal,
          discount: input.discount,
          tax,
          total,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: itemErr } = await supabase.from("invoice_items").insert(
        input.items.map((i) => ({
          invoice_id: data.id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          amount: i.quantity * i.unit_price,
        })),
      );
      if (itemErr) throw itemErr;
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
