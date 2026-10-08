"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Ruler, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "概要" },
  { href: "/capture", label: "撮影ガイド" },
  { href: "/result", label: "計測結果" },
  { href: "/staff", label: "スタッフ確認" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Ruler className="size-4" />
          </span>
          <span className="hidden font-display text-lg font-semibold tracking-tight min-[420px]:inline">CAMESUKE</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 text-sm md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3",
                isActive(item.href) && "bg-secondary text-foreground font-medium",
              )}
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
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                isActive(item.href) && "bg-secondary text-foreground font-medium",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
