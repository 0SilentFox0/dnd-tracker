import { slotOptions } from "./spell-costs";
import type { SpellFlowState } from "./spell-flow-types";
import { canCastFromSlot, castLevelOptions, grantsFor, selectedGrantOf, sourceOptions } from "./spell-grants";
import { spellDefinition } from "./spell-pick";

import { textRef } from "@/lib/i18n/text-ref";
import { spellEffectsFormula, spellFormulaLabel } from "@/lib/utils/battle/spell/caster-dice";
import type { BattleParticipant } from "@/types/battle";
import type { BookSpell } from "@/types/spells";
import type { LogLine } from "@/types/text";

/** Звідки платить за заклинання (слот чи дар), які рівні накладання доступні і формула кісток. */
export function spellSourceModel(caster: BattleParticipant | null, flow: SpellFlowState, selected: BookSpell | null, bypassCost: boolean) {
  const grantsOf = (s: BookSpell) => grantsFor(caster, s.id);

  const grantOf = (s: BookSpell) => selectedGrantOf(grantsOf(s), flow);

  const canSlot = (s: BookSpell) => canCastFromSlot(caster, s.id);

  const slotChoices = selected && !bypassCost && canSlot(selected) ? slotOptions(caster, selected.level) : [];

  const selectedGrant = selected ? grantOf(selected) : undefined;

  const castLevelOf = (s: BookSpell): number | undefined => {
    if (flow.castLevel !== undefined) return flow.castLevel;

    const grantLevel = grantOf(s)?.castLevel;

    if (grantLevel !== undefined) return grantLevel;

    if (!caster || !flow.slotKey || flow.pick?.spellId !== s.id) return undefined;

    return slotOptions(caster, s.level).find((o) => o.key === flow.slotKey)?.castLevel;
  };

  const formulaOf = (s: BookSpell): LogLine => {
    if (!caster) return "";

    const def = spellDefinition(s);

    if (flow.pick?.spellId === s.id && flow.pick.inputDice) return textRef("battleActions.spell.formula", { count: flow.pick.diceSlots.length, sides: flow.pick.inputDice.sides });

    if (def.dice === 0) return spellEffectsFormula(s.spellEffects ?? []);

    return spellFormulaLabel(caster, { dice: def.dice, groupId: s.spellGroup?.id ?? null, level: s.level, dieSides: s.dieSides, upcastDice: s.upcastDice, fixedDice: s.fixedDice }, castLevelOf(s));
  };

  return {
    grantsOf,
    grantOf,
    canSlot,
    slotChoices,
    selectedGrant,
    sourceOptions: selected ? sourceOptions(caster, grantsOf(selected), slotChoices) : [],
    castLevelOptions: castLevelOptions(caster, selectedGrant),
    formulaOf,
  };
}
