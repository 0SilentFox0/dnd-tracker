"use client";

import { Loader2 } from "lucide-react";

import { useBattleScene } from "@/lib/hooks/battle";
import { useConfirm } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";

export function BattleTopBar({ onComplete }: { onComplete?: () => void }) {
  const { battle, isDM, isMyTurn, connection, actions } = useBattleScene();

  const confirm = useConfirm();

  const reset = async () => {
    if (await confirm({ title: "Скинути бій?", description: "Бій повернеться до підготовки, журнал буде очищено.", confirmLabel: "Скинути" })) {
      await actions.reset.mutateAsync({});
    }
  };

  const nextPending = actions.nextTurn.isPending;

  return (
    <header className="flex h-12 items-center gap-3 px-4">
      <span className="hud-sc truncate text-[15px] tracking-[.08em]">{battle.name}</span>
      {isMyTurn && battle.status === "active" && <span className="hud-sc hidden h-8 items-center border-y border-[var(--enemy)] bg-[var(--enemy)]/20 px-4 text-[15px] tracking-[.12em] lg:flex">Твій хід</span>}
      <span className="hud-sc ml-auto flex items-center gap-2 text-sm text-[#b8ab95]">
        Раунд {battle.currentRound}
        <i className={cn("size-1.5 rounded-full", connection === "connected" ? "bg-[#9fb98a]" : "bg-[#f0b44c] animate-[hud-pulse_1.2s_infinite]")} />
      </span>
      {isDM && battle.status === "active" && (
        <span className="hidden gap-2 lg:flex">
          {onComplete && <button type="button" onClick={onComplete} className="hud-sc h-8 w-32 border border-emerald-500/50 text-sm text-emerald-400">Завершити</button>}
          <button type="button" onClick={() => void reset()} className="hud-sc h-8 w-28 border border-red-500/50 text-sm text-red-400">Скинути</button>
          <button type="button" disabled={nextPending} onClick={() => void actions.nextTurn.mutateAsync({})} className="hud-sc flex h-8 w-36 items-center justify-center bg-[var(--enemy)] text-sm text-white disabled:opacity-70">
            {nextPending ? <Loader2 className="size-4 animate-spin" /> : "Наступний хід"}
          </button>
        </span>
      )}
    </header>
  );
}
