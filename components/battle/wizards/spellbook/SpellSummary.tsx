import type { SpellFlowState } from "@/lib/utils/battle/flows";
import { targetingLabel } from "@/lib/utils/spells/model/labels";
import type { BattleParticipant } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

interface SpellSummaryProps {
  spell: BookSpell;
  state: SpellFlowState;
  targets: BattleParticipant[];
  formula: string;
  targeting: Parameters<typeof targetingLabel>[0];
  slotCost: string | null;
}

export function SpellSummary({ spell, state, targets, formula, targeting, slotCost }: SpellSummaryProps) {
  return (
    <>
      <div className="hud-sc text-xl font-bold">{spell.name}</div>
      <div className="mt-2 text-[15px]">
        {state.targetIds.length > 0 && <p>Цілі: {state.targetIds.map((id) => targets.find((t) => t.basicInfo.id === id)?.basicInfo.name).join(", ")}</p>}
        {state.pick?.targetMode === "none" && <p>Цілі: {targetingLabel(targeting)}</p>}
        {state.damage.length > 0 && <p>Кубики: {state.damage.join(" + ")} = {state.damage.reduce<number>((a, b) => a + (b ?? 0), 0)} ({formula})</p>}
        <p className="mt-2 text-sm italic text-[var(--hud-muted)]">Остаточний результат порахує бій з урахуванням захисту цілей.</p>
        {slotCost && <p className="text-sm italic text-[var(--hud-muted)]">{slotCost}</p>}
      </div>
      {state.waitingCrit && <p className="mt-2 text-sm italic text-[var(--hud-muted)]">ДМ обирає ефект критичного кидка…</p>}
      {state.error && <p className="mt-2 text-sm text-[#e9a08f]">{state.error}</p>}
    </>
  );
}
