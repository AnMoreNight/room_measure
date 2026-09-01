import { Link } from "@tanstack/react-router";
import { Menu, Ruler, X } from "lucide-react";
import { useState } from "react";

const nav = [
  { to: "/", label: "概要" },
  { to: "/capture", label: "撮影ガイド" },
  { to: "/result", label: "計測結果" },
  { to: "/staff", label: "スタッフ確認" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Ruler className="size-4" />
          </span>
          <span className="hidden font-display text-lg font-semibold tracking-tight min-[420px]:inline">CAMESUKE</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 text-sm md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3"
              activeProps={{ className: "bg-secondary text-foreground font-medium" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          aria-label={open ? "メニューを閉じる" : "メニューを開く"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto inline-flex size-10 items-center justify-center rounded-md text-foreground hover:bg-secondary md:ml-0 md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-menu"
          className="flex flex-col gap-1 border-t border-border bg-background px-4 py-3 md:hidden"
        >
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground font-medium" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
