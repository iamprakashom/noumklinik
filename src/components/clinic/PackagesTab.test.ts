import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Window } from "happy-dom";

let lastPackagesUpdate: { id: string; values: Record<string, unknown> } | null = null;
let lastPackagesInsert: Record<string, unknown> | null = null;
let lastPackageItemsInsert: Record<string, unknown>[] | null = null;
let packageItemsDeleteIds: string[] = [];

mock.module("@/integrations/supabase/client", () => {
  const DB: Record<string, Record<string, unknown>[]> = {
    packages: [
      {
        id: "pkg-1",
        clinic_id: "c1",
        name: "Laser + Botox",
        description: "Bundle deal",
        price: 12000,
        validity_days: 180,
        refundable: true,
        active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    package_items: [
      {
        id: "item-1",
        clinic_id: "c1",
        package_id: "pkg-1",
        service_id: "s1",
        sessions: 3,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "item-2",
        clinic_id: "c1",
        package_id: "pkg-1",
        service_id: "s2",
        sessions: 2,
        created_at: "2026-01-02T00:00:00Z",
      },
    ],
    services: [
      { id: "s1", name: "Laser hair removal", price: 4000, duration_min: 30, active: true },
      { id: "s2", name: "Botox", price: 8000, duration_min: 20, active: true },
    ],
  };

  return {
    supabase: {
      from: (table: string) => ({
        select: () => ({
          order: () => Promise.resolve({ data: DB[table] ?? [], error: null }),
        }),
        insert: (payload: Record<string, unknown> | Record<string, unknown>[]) => {
          const rows = Array.isArray(payload) ? payload : [payload];
          const withIds = rows.map((row, index) => ({ ...row, id: `${table}-${index}` }));
          if (table === "packages") lastPackagesInsert = withIds[0] ?? null;
          if (table === "package_items") lastPackageItemsInsert = rows;
          return { select: () => Promise.resolve({ data: withIds, error: null }) };
        },
        update: (values: Record<string, unknown>) => ({
          eq: (_column: string, value: string) => {
            if (table === "packages") lastPackagesUpdate = { id: value, values };
            return Promise.resolve({ error: null });
          },
        }),
        delete: () => ({
          eq: (_column: string, value: string) => {
            if (table === "package_items") packageItemsDeleteIds.push(value);
            return Promise.resolve({ error: null });
          },
        }),
      }),
    },
  };
});

mock.module("@/components/ui/dialog", () => {
  const passthrough = ({ children }: { children?: unknown }) => children ?? null;
  return {
    Dialog: passthrough,
    DialogContent: passthrough,
    DialogHeader: passthrough,
    DialogFooter: passthrough,
    DialogTitle: passthrough,
  };
});

const testWindow = new Window();
const testDocument = testWindow.document as unknown as Document;
globalThis.document = testDocument;
globalThis.window = testWindow as unknown as typeof globalThis.window;
const windowGlobals = testWindow as unknown as Record<string, unknown>;
for (const key of [
  "HTMLElement",
  "HTMLFormElement",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "HTMLSelectElement",
  "HTMLButtonElement",
  "HTMLDivElement",
  "Node",
  "Event",
  "CustomEvent",
  "KeyboardEvent",
  "MouseEvent",
  "PointerEvent",
  "MutationObserver",
  "ResizeObserver",
] as const) {
  if (windowGlobals[key]) (globalThis as Record<string, unknown>)[key] = windowGlobals[key];
}

const { render, waitFor, cleanup, within } = await import("@testing-library/react");
const userEventModule = await import("@testing-library/user-event");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const React = await import("react");
const { PackagesTab } = await import("./PackagesTab");

let container: HTMLElement;

afterEach(() => cleanup());
beforeEach(() => {
  lastPackagesUpdate = null;
  lastPackagesInsert = null;
  lastPackageItemsInsert = null;
  packageItemsDeleteIds = [];
});

function renderTab() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  container = testDocument.createElement("div") as unknown as HTMLElement;
  testDocument.body.appendChild(container);
  render(React.createElement(QueryClientProvider, { client }, React.createElement(PackagesTab)), {
    container,
  });
}

function makeUser() {
  return userEventModule.default.setup({ document: testDocument });
}

describe("PackagesTab — edit package", () => {
  it("pre-fills the edit dialog with the package's current details", async () => {
    renderTab();
    const user = makeUser();
    const q = within(container);
    await waitFor(() => expect(q.getByText("Laser + Botox")).toBeTruthy());

    await user.click(q.getByRole("button", { name: /edit laser \+ botox/i }));

    await waitFor(() => expect(q.getByText("Edit package")).toBeTruthy());
    expect(
      (q.getByPlaceholderText("6 sessions — Laser hair removal") as HTMLInputElement).value,
    ).toBe("Laser + Botox");
    expect((q.getByDisplayValue("Bundle deal") as HTMLTextAreaElement).value).toBe("Bundle deal");
    expect((q.getByDisplayValue("12000") as HTMLInputElement).value).toBe("12000");
    expect((q.getByDisplayValue("180") as HTMLInputElement).value).toBe("180");

    const sessionInputs = q.getAllByLabelText("Sessions");
    expect((sessionInputs as HTMLInputElement[]).map((i) => i.value)).toEqual(["3", "2"]);
    const serviceSelects = q.getAllByLabelText("Service");
    expect((serviceSelects as HTMLSelectElement[]).map((s) => s.value)).toEqual(["s1", "s2"]);
  });

  it("saving an edit updates the package and replaces its session lines", async () => {
    renderTab();
    const user = makeUser();
    const q = within(container);
    await waitFor(() => expect(q.getByText("Laser + Botox")).toBeTruthy());
    await user.click(q.getByRole("button", { name: /edit laser \+ botox/i }));

    const price = q.getByDisplayValue("12000");
    await user.clear(price);
    await user.type(price, "15000");

    const validity = q.getByDisplayValue("180");
    await user.clear(validity);
    await user.type(validity, "120");

    const sessionInputs = q.getAllByLabelText("Sessions");
    await user.clear(sessionInputs[0]!);
    await user.type(sessionInputs[0]!, "4");

    await user.click(q.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(lastPackagesUpdate).not.toBeNull());
    expect(lastPackagesUpdate).toEqual({
      id: "pkg-1",
      values: {
        name: "Laser + Botox",
        description: "Bundle deal",
        price: 15000,
        validity_days: 120,
        refundable: true,
      },
    });
    await waitFor(() => expect(lastPackageItemsInsert).not.toBeNull());
    expect(packageItemsDeleteIds).toEqual(["item-1", "item-2"]);
    expect(lastPackageItemsInsert).toEqual([
      { package_id: "pkg-1", service_id: "s1", sessions: 4 },
      { package_id: "pkg-1", service_id: "s2", sessions: 2 },
    ]);
  });

  it("creating a package still adds the package and its session lines", async () => {
    renderTab();
    const user = makeUser();
    const q = within(container);
    await waitFor(() => expect(q.getByText("Laser + Botox")).toBeTruthy());

    await user.click(q.getByRole("button", { name: "New package" }));

    expect(
      (q.getByPlaceholderText("6 sessions — Laser hair removal") as HTMLInputElement).value,
    ).toBe("");
    await user.type(q.getByPlaceholderText("6 sessions — Laser hair removal"), "VIP package");
    await user.selectOptions(q.getByLabelText("Service"), "s1");

    const price = q.getByDisplayValue("0");
    await user.clear(price);
    await user.type(price, "9999");

    await user.click(q.getByRole("button", { name: "Create package" }));

    await waitFor(() => expect(lastPackagesInsert).not.toBeNull());
    expect(lastPackagesInsert).toMatchObject({
      name: "VIP package",
      price: 9999,
      validity_days: 180,
      refundable: false,
    });
    await waitFor(() => expect(lastPackageItemsInsert).not.toBeNull());
    expect(lastPackageItemsInsert).toEqual([
      { package_id: "packages-0", service_id: "s1", sessions: 6 },
    ]);
  });

  it("blocks saving an edit when no session line has a service selected", async () => {
    renderTab();
    const user = makeUser();
    const q = within(container);
    await waitFor(() => expect(q.getByText("Laser + Botox")).toBeTruthy());
    await user.click(q.getByRole("button", { name: /edit laser \+ botox/i }));

    const serviceSelects = q.getAllByLabelText("Service");
    await user.selectOptions(serviceSelects[0]!, "");
    await user.selectOptions(serviceSelects[1]!, "");

    await user.click(q.getByRole("button", { name: "Save changes" }));

    expect(lastPackagesUpdate).toBeNull();
    expect(packageItemsDeleteIds).toEqual([]);
    expect(lastPackageItemsInsert).toBeNull();
  });
});
