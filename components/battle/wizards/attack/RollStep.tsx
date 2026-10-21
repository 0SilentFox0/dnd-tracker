import { useState } from "react";

import { type AttackWizardModel,btn } from "./shared";

import { AiRollButton, DiceGrid } from "@/components/battle/hud/DiceInput";
import { cn } from "@/lib/utils";
import type { AttackMode } from "@/lib/utils/battle/flows";
import type { BattleParticipant } from "@/types/battle";

const MODES: [AttackMode, string][] = [["normal", "Звичайний"], ["advantage", "Перевага"], ["disadvantage", "Недолік"]];

/** Перший кубик переваги/недоліку живе тут: батько ремаунтить крок на кожен удар і при закритті. */
export function RollStep({ wizard: { state, view, actions }, target }: { wizard: AttackWizardModel; target: BattleParticipant }) {
  const [first, setFirst] = useState<number | undefined>();

  const pick = (v: number) => {
    if (view.rollMode !== "normal" && first === undefined) setFirst(v);
    else actions.roll(first ?? v, first === undefined ? undefined : v);
  };

  return (
    <>
      <div className="hud-sc text-xl font-bold">Кидок атаки · d20</div>
      {state.strikes.length > 1 && <div className="mt-1 text-sm text-[var(--hud-muted)]">Удар {state.index + 1} з {state.strikes.length} · {target.basicInfo.name}</div>}
      <div className={cn("mt-3 grid h-10 grid-cols-3 border border-white/20", view.forcedMode && "opacity-60")}>
        {MODES.map(([m, label]) => (
          <button key={m} type="button" disabled={!!view.forcedMode} onClick={() => actions.setMode(m)} className={cn("border-l border-white/20 text-sm first:border-l-0 disabled:cursor-not-allowed", view.rollMode === m ? "bg-white/10 font-bold text-[var(--ink)]" : "text-[#a89c88]")}>{label}</button>
        ))}
      </div>
      {view.forcedMode && <div className="mt-1.5 text-xs text-[#cdb87e]">{view.forcedMode.reason}</div>}
      {view.rollMode !== "normal" && <div className="mt-2 text-xs text-[var(--hud-muted)]">Спершу перший кубик, потім другий</div>}
      <DiceGrid sides={20} value={first} onPick={pick} />
      <div className="mt-3 grid grid-cols-[1.25fr_1fr] gap-2">
        <AiRollButton onClick={actions.aiRoll} />
        <button type="button" onClick={actions.back} className={cn(btn, "border-white/25")}>Назад</button>
      </div>
    </>
  );
}
