import { useState } from "react";

import { type AttackWizardModel,btn, primaryBtn } from "./shared";

import { AiRollButton, DamageDice } from "@/components/battle/hud/DiceInput";
import { cn } from "@/lib/utils";
import { cryptoRandom, rollDie } from "@/lib/utils/common/dice";

export function DamageStep({ wizard: { state, actions } }: { wizard: AttackWizardModel }) {
  const [draft, setDraft] = useState<(number | undefined)[]>([]);

  const strike = state.strikes[state.index];

  const setDie = (i: number, v: number | undefined) =>
    setDraft((d) => {
      const next = [...d];

      next[i] = v;

      return next;
    });

  return (
    <>
      <div className="hud-sc text-xl font-bold">Шкода{strike?.outcome === "crit" ? " · критичне" : ""}</div>
      <DamageDice slots={state.diceSlots} values={draft} onChange={setDie} />
      <div className="mt-3 grid grid-cols-[1.25fr_1fr] gap-2">
        <AiRollButton onClick={() => setDraft(state.diceSlots.map((sides) => rollDie(sides, cryptoRandom)))} />
        <button type="button" disabled={state.diceSlots.some((_, i) => draft[i] === undefined)} onClick={() => actions.damage(draft as number[])} className={cn(btn, primaryBtn, "disabled:opacity-50")}>
          Далі · підсумок
        </button>
      </div>
    </>
  );
}
