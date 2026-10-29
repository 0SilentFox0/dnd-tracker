import { ParticipantSourceType } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { isFiveE } from "@/lib/utils/battle/attack/ability";
import { type SpellDice, spellDice, spellDice5e } from "@/lib/utils/spells/model/dice";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export const upcastSteps = (spellLevel: number, castLevel: number): number => Math.max(0, castLevel - spellLevel);

export function casterSpellDice(
  caster: BattleParticipant,
  spell: { dice: number; groupId: string | null; level?: number; dieSides?: number | null; upcastDice?: number | null; fixedDice?: boolean },
  castLevel?: number,
): SpellDice {
  if (isFiveE(caster)) return spellDice5e({ dice: spell.dice, level: spell.level ?? 0, dieSides: spell.dieSides ?? undefined, upcastDice: spell.fixedDice ? 0 : spell.upcastDice ?? undefined }, spell.fixedDice ? 1 : caster.abilities.level, castLevel ?? spell.level ?? 0);

  const kind = caster.basicInfo.sourceType === ParticipantSourceType.CHARACTER ? "hero" : "unit";

  const mastery = caster.battleData.schoolMastery ?? {};

  return spellDice({ kind, level: caster.abilities.level }, { dice: spell.dice, groupId: spell.groupId }, (group) => (group ? (mastery[group] ?? null) : null));
}

/** «6к10»: кубики за рівнем героя і майстерністю школи, без плоских бонусів. */
export function spellFormulaLabel(caster: BattleParticipant, spell: Parameters<typeof casterSpellDice>[1], castLevel?: number): LogLine {
  const { count, sides } = casterSpellDice(caster, spell, castLevel);

  return count === 0 ? textRef("battleActions.spell.noDice") : textRef("battleActions.spell.formula", { count, sides });
}
