"use client";

import { memo } from "react";
import { Trophy } from "lucide-react";

import { useBattleSceneData } from "@/lib/hooks/battle";
import { lastAction } from "@/lib/utils/battle/view";

export const BattleOverBanner = memo(function BattleOverBanner() {
  const { battle } = useBattleSceneData();

  const last = lastAction(battle.battleLog ?? []);

  return (
    <div className="mx-4 mt-2 flex min-h-10 items-center justify-center gap-3 border-y border-[var(--gold)]/60 bg-[var(--gold)]/10 px-3 py-1.5 text-center">
      <Trophy className="size-4 shrink-0 text-[var(--gold)]" />
      <span className="hud-sc text-[17px] tracking-[.12em] text-[var(--ink)]">Бій завершено</span>
      {last && <span className="truncate text-sm text-[#b8ab95]">{last.resultText}</span>}
    </div>
  );
});
