"use client";

import { Portrait } from "@/components/battle/hud";
import { useBattleScene } from "@/lib/hooks/battle";
import { lastAction } from "@/lib/utils/battle/view";

export function LastActionTicker({ onOpenLog }: { onOpenLog?: () => void }) {
  const { battle } = useBattleScene();

  const last = lastAction(battle.battleLog ?? []);

  if (!last) return null;

  const order = battle.initiativeOrder;

  const actor = order.find((p) => p.basicInfo.id === last.actorId);

  const target = order.find((p) => p.basicInfo.id === last.targets?.[0]?.participantId);

  const change = last.hpChanges?.[0]?.change ?? 0;

  return (
    <button type="button" onClick={onOpenLog} className="mx-4 flex h-10 w-[calc(100%-2rem)] items-center gap-2 border-y border-white/10 text-left text-sm text-[#d9cfbd]">
      {actor && <Portrait participant={actor} size={24} />}
      <span className="truncate">{last.actorName}</span>
      {target && <><span className="text-[var(--hud-muted)]">→</span><Portrait participant={target} size={24} /><span className="truncate">{target.basicInfo.name}</span></>}
      {change !== 0 && <b className={change > 0 ? "text-[#e9a08f]" : "text-[#8fd07a]"}>{change > 0 ? `−${change}` : `+${-change}`}</b>}
      {!target && change === 0 && <span className="truncate text-[var(--hud-muted)]">{last.resultText}</span>}
      {onOpenLog && <span className="ml-auto shrink-0 text-[13px] text-[var(--hud-muted)]">журнал ›</span>}
    </button>
  );
}
