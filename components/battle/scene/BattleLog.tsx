"use client";

import { useBattleScene } from "@/lib/hooks/battle";
import { sanitizeLogEntry } from "@/lib/utils/battle/view";

export function BattleLog() {
  const { battle, viewer } = useBattleScene();

  const entries = [...(battle.battleLog ?? [])].reverse().map((e) => sanitizeLogEntry(e, viewer));

  return (
    <div className="text-sm leading-5 text-[#cfc5b2]">
      {entries.map((e, i) => (
        <div key={e.actionIndex} className="border-b border-white/[.06] py-2.5">
          {(i === 0 || entries[i - 1].round !== e.round) && <div className="text-xs text-[var(--muted)]">Раунд {e.round}</div>}
          {e.resultText}
        </div>
      ))}
    </div>
  );
}
