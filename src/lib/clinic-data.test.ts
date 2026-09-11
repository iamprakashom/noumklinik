import { describe, it, expect, mock } from "bun:test";
import { Window } from "happy-dom";
import type { Lead, PatientPackageItem } from "@/data/clinic";

let lastPatientsInsert: Record<string, unknown> | null = null;
let lastLeadsUpdate: Record<string, unknown> | null = null;

mock.module("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "patients") {
        return {
          insert: (payload: Record<string, unknown>) => {
            lastPatientsInsert = payload;
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: "patient-1" }, error: null }),
              }),
            };
          },
        };
      }
      if (table === "leads") {
        return {
          update: (payload: Record<string, unknown>) => {
            lastLeadsUpdate = payload;
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        };
      }
      return {};
    },
  },
}));

const window = new Window();
globalThis.document = window.document as unknown as Document;
globalThis.window = window as unknown as typeof globalThis.window;
globalThis.HTMLElement = window.HTMLElement as unknown as typeof globalThis.HTMLElement;

const { useConvertLead, unusedValue } = await import("@/lib/clinic-data");
const { renderHook, act, waitFor } = await import("@testing-library/react");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const React = await import("react");

function createWrapper() {
  const qc = new QueryClient();
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    clinic_id: "c1",
    full_name: "Test Lead",
    phone: "9876543210",
    email: null,
    birth_date: null,
    source: "Organic",
    source_group: "Organic",
    interest: null,
    notes: null,
    stage: "New",
    temperature: "Warm",
    service_id: null,
    owner_id: null,
    next_follow_up_at: null,
    converted_patient_id: null,
    external_id: null,
    created_at: "2026-09-10T00:00:00Z",
    updated_at: "2026-09-10T00:00:00Z",
    ...overrides,
  };
}

describe("useConvertLead", () => {
  it("carries birth_date from lead into the new patient record", async () => {
    lastPatientsInsert = null;
    const { result } = renderHook(() => useConvertLead(), { wrapper: createWrapper() });

    const lead = makeLead({
      full_name: "Anya Sharma",
      phone: "9876543210",
      email: "anya@test.com",
      birth_date: "1995-06-15",
      source: "Meta Ads",
      source_group: "Meta Ads",
      interest: "Laser",
    });

    await act(async () => {
      result.current.mutate(lead);
    });

    await waitFor(() => expect(lastPatientsInsert).not.toBeNull());
    expect(lastPatientsInsert!["birth_date"]).toBe("1995-06-15");
  });

  it("passes null birth_date when lead has no DOB", async () => {
    lastPatientsInsert = null;
    const { result } = renderHook(() => useConvertLead(), { wrapper: createWrapper() });

    const lead = makeLead({
      id: "lead-2",
      full_name: "Ravi Kumar",
      phone: "9123456789",
      source: "Walk-in",
      source_group: "Walk-in",
      temperature: "Cold",
    });

    await act(async () => {
      result.current.mutate(lead);
    });

    await waitFor(() => expect(lastPatientsInsert).not.toBeNull());
    expect(lastPatientsInsert!["birth_date"]).toBeNull();
  });

  it("marks the lead as Converted after successful patient creation", async () => {
    lastPatientsInsert = null;
    lastLeadsUpdate = null;
    const { result } = renderHook(() => useConvertLead(), { wrapper: createWrapper() });

    const lead = makeLead({
      id: "lead-3",
      full_name: "Priya Singh",
      phone: "9988776655",
      birth_date: "2000-01-20",
      source: "Google",
      source_group: "Google Ads",
      interest: "Botox",
      stage: "Contacted",
      temperature: "Hot",
    });

    await act(async () => {
      result.current.mutate(lead);
    });

    await waitFor(() => expect(lastLeadsUpdate).not.toBeNull());
    expect(lastLeadsUpdate!["stage"]).toBe("Converted");
    expect(lastLeadsUpdate!["converted_patient_id"]).toBe("patient-1");
  });

  it("splits single-word full_name into first_name and dash last_name", async () => {
    lastPatientsInsert = null;
    const { result } = renderHook(() => useConvertLead(), { wrapper: createWrapper() });

    const lead = makeLead({
      id: "lead-4",
      full_name: "John",
      source: "Referral",
      source_group: "Referral",
    });

    await act(async () => {
      result.current.mutate(lead);
    });

    await waitFor(() => expect(lastPatientsInsert).not.toBeNull());
    expect(lastPatientsInsert!["first_name"]).toBe("John");
    expect(lastPatientsInsert!["last_name"]).toBe("—");
  });

  it("converts interest into tags array", async () => {
    lastPatientsInsert = null;
    const { result } = renderHook(() => useConvertLead(), { wrapper: createWrapper() });

    const lead = makeLead({ id: "lead-5", interest: "Hair removal" });

    await act(async () => {
      result.current.mutate(lead);
    });

    await waitFor(() => expect(lastPatientsInsert).not.toBeNull());
    expect(lastPatientsInsert!["tags"]).toEqual(["Hair removal"]);
  });

  it("sets tags to empty array when interest is null", async () => {
    lastPatientsInsert = null;
    const { result } = renderHook(() => useConvertLead(), { wrapper: createWrapper() });

    const lead = makeLead({ id: "lead-6" });

    await act(async () => {
      result.current.mutate(lead);
    });

    await waitFor(() => expect(lastPatientsInsert).not.toBeNull());
    expect(lastPatientsInsert!["tags"]).toEqual([]);
  });
});

describe("unusedValue", () => {
  it("returns 0 for an empty items list", () => {
    expect(unusedValue([])).toBe(0);
  });

  it("calculates unused value from remaining sessions", () => {
    const items: PatientPackageItem[] = [
      {
        id: "1",
        clinic_id: "c1",
        patient_package_id: "pkg-1",
        service_id: "s1",
        service_name: "Laser",
        sessions_total: 10,
        sessions_used: 3,
        unit_value: 1000,
        created_at: "2026-01-01",
      },
      {
        id: "2",
        clinic_id: "c1",
        patient_package_id: "pkg-1",
        service_id: "s2",
        service_name: "Botox",
        sessions_total: 5,
        sessions_used: 5,
        unit_value: 2000,
        created_at: "2026-01-01",
      },
    ];

    expect(unusedValue(items)).toBe(7000);
  });

  it("treats fully used items as zero value", () => {
    const items: PatientPackageItem[] = [
      {
        id: "1",
        clinic_id: "c1",
        patient_package_id: "pkg-1",
        service_id: "s1",
        service_name: "Laser",
        sessions_total: 4,
        sessions_used: 4,
        unit_value: 500,
        created_at: "2026-01-01",
      },
    ];

    expect(unusedValue(items)).toBe(0);
  });

  it("handles items where sessions_used exceeds total", () => {
    const items: PatientPackageItem[] = [
      {
        id: "1",
        clinic_id: "c1",
        patient_package_id: "pkg-1",
        service_id: "s1",
        service_name: "Laser",
        sessions_total: 2,
        sessions_used: 3,
        unit_value: 500,
        created_at: "2026-01-01",
      },
    ];

    expect(unusedValue(items)).toBe(0);
  });
});
