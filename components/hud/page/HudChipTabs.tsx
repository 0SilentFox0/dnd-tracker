"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface ChipItem {
  key: string;
  label: ReactNode;
  href?: string;
  active: boolean;
  onSelect?: () => void;
}

const CHIP = "flex h-8 shrink-0 items-center rounded-full px-3 text-[13px] text-hud-muted shadow-[inset_0_0_0_1px_var(--color-hud-line)]";

const ACTIVE = "text-[#ffd9a8] shadow-[inset_0_0_0_1px_#e6c25a,0_0_8px_rgba(230,194,90,.3)]";

export function HudChipTabs({ items, ariaLabel }: { items: ChipItem[]; ariaLabel: string }) {
  return (
    <nav aria-label={ariaLabel} className="hud-scroll-x -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1">
      {items.map((it) =>
        it.href ? (
          <Link key={it.key} href={it.href} aria-current={it.active ? "page" : undefined} className={cn(CHIP, it.active && ACTIVE)}>
            {it.label}
          </Link>
        ) : (
          <button key={it.key} type="button" aria-pressed={it.active} onClick={it.onSelect} className={cn(CHIP, it.active && ACTIVE)}>
            {it.label}
          </button>
        ),
      )}
    </nav>
  );
}
