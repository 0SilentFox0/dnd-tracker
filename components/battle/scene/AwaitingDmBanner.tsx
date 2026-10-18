"use client";

import { memo } from "react";
import { Hourglass } from "lucide-react";

export const AwaitingDmBanner = memo(function AwaitingDmBanner() {
  return (
    <div className="mx-4 mt-2 flex min-h-10 items-center justify-center gap-3 border-y border-[var(--gold)]/60 bg-[var(--gold)]/10 px-3 py-1.5 text-center">
      <Hourglass className="size-4 shrink-0 text-[var(--gold)]" />
      <span className="hud-sc text-[17px] tracking-[.12em] text-[var(--ink)]">Очікуємо рішення ДМ</span>
    </div>
  );
});
