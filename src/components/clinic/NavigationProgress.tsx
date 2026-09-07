import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Top loading bar shown while a route navigation is in flight.
 * Delayed ~200ms so fast navigations don't flash it.
 */
export function NavigationProgress() {
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      const done = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(done);
    }

    const show = setTimeout(() => {
      setVisible(true);
      setProgress(30);
    }, 200);

    return () => clearTimeout(show);
  }, [isLoading]);

  useEffect(() => {
    if (!visible) return;
    // Creep toward ~90% while waiting so it always feels alive.
    const tick = setInterval(() => {
      setProgress((p) => (p < 90 ? p + (90 - p) * 0.08 : p));
    }, 150);
    return () => clearInterval(tick);
  }, [visible]);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px] shadow-primary/40 transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
