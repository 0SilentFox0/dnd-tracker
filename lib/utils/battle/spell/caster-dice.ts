import { ParticipantSourceType } from "@/lib/constants/battle";
import { type SpellDice, spellDice } from "@/lib/utils/spells/model/dice";
import type { BattleParticipant } from "@/types/battle";

export function casterSpellDice(caster: BattleParticipant, spell: { dice: number; groupId: string | null }): SpellDice {
  const kind = caster.basicInfo.sourceType === ParticipantSourceType.CHARACTER ? "hero" : "unit";

  const mastery = caster.battleData.schoolMastery ?? {};

  return spellDice({ kind, level: caster.abilities.level }, { dice: spell.dice, groupId: spell.groupId }, (group) => (group ? (mastery[group] ?? null) : null));
}
