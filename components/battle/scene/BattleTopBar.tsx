"use client";

import { Loader2 } from "lucide-react";

import { BattleStatus } from "@/lib/constants/battle";
import { useBattleScene } from "@/lib/hooks/battle";
import { useConfirm } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";

export function BattleTopBar({ onComplete }: { onComplete?: () => void }) {
  const { battle, isDM, isMyTurn, connection, actions } = useBattleScene();

  const confirm = useConfirm();

  const reset = async () => {
    if (await confirm({ title: "Скинути бій?", description: "Бій повернеться до підготовки, журнал буде очищено.", confirmLabel: "Скинути" })) {
      actions.reset.mutate({});
    }
  };

  const nextPending = actions.nextTurn.isPending;

  return (
    <header className="flex h-12 items-center gap-3 px-4">
      <span className="hud-sc truncate text-[15px] tracking-[.08em]">{battle.name}</span>
      {isMyTurn && battle.status === BattleStatus.ACTIVE && <span className="hud-sc hidden h-8 items-center border-y border-[var(--enemy)] bg-[var(--enemy)]/20 px-4 text-[15px] tracking-[.12em] lg:flex">Твій хід</span>}
      <span className="hud-sc ml-auto flex items-center gap-2 text-sm text-[#b8ab95]">
        Раунд {battle.currentRound}
        <i className={cn("size-1.5 rounded-full", connection === "connected" ? "bg-[#9fb98a]" : "bg-[#f0b44c] animate-[hud-pulse_1.2s_infinite]")} />
      </span>
      {isDM && battle.status !== BattleStatus.PREPARED && (
        <span className="hidden gap-2 lg:flex">
          {onComplete && battle.status === BattleStatus.ACTIVE && <button type="button" onClick={onComplete} className="hud-sc h-8 w-32 border border-[var(--gold)]/60 text-sm text-[var(--gold)] hover:bg-[var(--gold)]/10">Завершити</button>}
          <button type="button" onClick={() => void reset()} className="hud-sc h-8 w-28 border border-hud-danger/50 text-sm text-hud-danger hover:bg-hud-danger/10">Скинути</button>
          {battle.status === BattleStatus.ACTIVE && <button type="button" disabled={nextPending} onClick={() => actions.nextTurn.mutate({})} className="hud-sc flex h-8 w-36 items-center justify-center bg-[var(--enemy)] text-sm text-[var(--ink)] disabled:opacity-70">
            {nextPending ? <Loader2 className="size-4 animate-spin" /> : "Наступний хід"}
          </button>}
        </span>
      )}
    </header>
  );
}
