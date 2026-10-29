import { useTranslations } from "next-intl";

import { CritWaitingNote } from "@/components/battle/crit-choice/CritWaitingNote";
import { useText } from "@/lib/i18n/use-text";
import type { SpellFlowState } from "@/lib/utils/battle/flows";
import { targetingLabel } from "@/lib/utils/spells/model/labels";
import type { BattleParticipant } from "@/types/battle";
import type { BookSpell } from "@/types/spells";
import type { LogLine } from "@/types/text";

interface SpellSummaryProps {
  spell: BookSpell;
  state: SpellFlowState;
  targets: BattleParticipant[];
  formula: string;
  targeting: Parameters<typeof targetingLabel>[0];
  slotCost: LogLine | null;
}

export function SpellSummary({ spell, state, targets, formula, targeting, slotCost }: SpellSummaryProps) {
  const tw = useTranslations("battleWizards.spell.summary");

  const text = useText();

  return (
    <>
      <div className="hud-sc text-xl font-bold">{spell.name}</div>
      <div className="mt-2 text-[15px]">
        {state.targetIds.length > 0 && <p>{tw("targets", { targets: state.targetIds.map((id) => targets.find((t) => t.basicInfo.id === id)?.basicInfo.name).join(", ") })}</p>}
        {state.pick?.targetMode === "none" && <p>{tw("targets", { targets: text(targetingLabel(targeting)) })}</p>}
        {state.damage.length > 0 && <p>{tw("dice", { dice: state.damage.join(" + "), sum: state.damage.reduce<number>((a, b) => a + (b ?? 0), 0), formula })}</p>}
        <p className="mt-2 text-sm italic text-[var(--hud-muted)]">{tw("note")}</p>
        {slotCost && <p className="text-sm italic text-[var(--hud-muted)]">{text(slotCost)}</p>}
      </div>
      {state.waitingCrit && <CritWaitingNote />}
      {state.error && <p className="mt-2 text-sm text-[#e9a08f]">{text(state.error)}</p>}
    </>
  );
}
