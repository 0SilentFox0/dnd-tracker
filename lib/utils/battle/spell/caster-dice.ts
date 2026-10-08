import { spellcastingModifier } from "./power";

import { ParticipantSourceType } from "@/lib/constants/battle";
import { type SpellDice, spellDice } from "@/lib/utils/spells/model/dice";
import type { BattleParticipant } from "@/types/battle";

export function casterSpellDice(caster: BattleParticipant, spell: { dice: number; groupId: string | null }): SpellDice {
  const kind = caster.basicInfo.sourceType === ParticipantSourceType.CHARACTER ? "hero" : "unit";

  const mastery = caster.battleData.schoolMastery ?? {};

  return spellDice({ kind, level: caster.abilities.level }, { dice: spell.dice, groupId: spell.groupId }, (group) => (group ? (mastery[group] ?? null) : null));
}

/** «6к10 + 10»: кубики за рівнем і майстерністю плюс рівень і модифікатор характеристики кастера. */
export function spellFormulaLabel(caster: BattleParticipant, spell: { dice: number; groupId: string | null }): string {
  const { count, sides, flat } = casterSpellDice(caster, spell);

  if (count === 0) return "без кубиків";

  const bonus = flat + spellcastingModifier(caster).mod;

  return `${count}к${sides}${bonus === 0 ? "" : bonus > 0 ? ` + ${bonus}` : ` − ${-bonus}`}`;
}
