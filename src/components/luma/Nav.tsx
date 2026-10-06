import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDemoModal } from "@/components/luma/BookDemoModal";
import logoAsset from "@/assets/klinik-logo.png.asset.json";

const links = [
  { label: "Product", href: "#product" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

export function Nav() {
  const { openDemo } = useDemoModal();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-border bg-background/85 backdrop-blur-md" : "border-b border-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 lg:h-20 lg:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <img
            src={logoAsset.url}
            alt="KLINIK By Nouhm logo"
            className="size-9 rounded-full"
          />
          <span className="text-[15px] font-extrabold tracking-tight">KLINIK <span className="font-semibold text-muted-foreground">By Nouhm</span></span>
        </a>

        <div className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary-dark"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-5 lg:flex">
          <Link
            to="/app/auth"
            className="text-sm font-medium text-foreground transition-colors hover:text-primary-dark"
          >
            Sign In
          </Link>
          <button
            type="button"
            onClick={openDemo}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-dark hover:shadow-card"
          >
            Book a Demo
          </button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={openDemo}
            className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
          >
            Book a Demo
          </button>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-full border border-border bg-card text-foreground"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-border bg-background px-5 pb-6 pt-3 lg:hidden">
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-border py-3.5 text-[15px] font-medium text-foreground"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                to="/app/auth"
                onClick={() => setOpen(false)}
                className="block w-full py-3.5 text-left text-[15px] font-medium text-muted-foreground"
              >
                Sign In
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
