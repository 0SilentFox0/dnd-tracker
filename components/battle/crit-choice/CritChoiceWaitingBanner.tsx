"use client";

import { Hourglass } from "lucide-react";

import { useBattleScene } from "@/lib/hooks/battle";

export function CritChoiceWaitingBanner() {
  const { battle, viewer: { isDM } } = useBattleScene();

  if (isDM || !battle.pendingCritChoice) return null;

  return (
    <div role="status" className="flex min-h-10 items-center justify-center gap-3 border-y border-[var(--gold)]/60 bg-[var(--gold)]/10 px-3 py-1.5 text-center">
      <Hourglass className="size-4 shrink-0 text-[var(--gold)]" />
      <span className="hud-sc text-[17px] tracking-[.12em] text-[var(--ink)]">ДМ обирає ефект…</span>
    </div>
  );
}
