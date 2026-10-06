import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import { BookDemoForm } from "@/components/luma/BookDemoForm";

type DemoModalContextValue = {
  openDemo: () => void;
  closeDemo: () => void;
};

const DemoModalContext = createContext<DemoModalContextValue | null>(null);

export function useDemoModal() {
  const ctx = useContext(DemoModalContext);
  if (!ctx) {
    throw new Error("useDemoModal must be used within DemoModalProvider");
  }
  return ctx;
}

export function DemoModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const openDemo = useCallback(() => setOpen(true), []);
  const closeDemo = useCallback(() => setOpen(false), []);

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <DemoModalContext.Provider value={{ openDemo, closeDemo }}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Book a Demo"
        >
          <button
            type="button"
            aria-label="Close dialog"
            onClick={closeDemo}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div
            ref={dialogRef}
            className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-background p-5 shadow-float sm:p-7"
          >
            <div className="mb-4 flex items-start justify-between gap-4 pr-10">
              <div>
                <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-primary-dark">
                  Book a Demo
                </p>
                <h2 className="mt-2 text-[22px] font-extrabold leading-tight text-foreground sm:text-[26px]">
                  Stop losing patients between the first message and the treatment room.
                </h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                  Book a 20-minute walkthrough and we'll show you KLINIK on your clinic's workflow.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDemo}
                aria-label="Close"
                className="absolute right-4 top-4 grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
            <BookDemoForm />
          </div>
        </div>
      )}
    </DemoModalContext.Provider>
  );
}
