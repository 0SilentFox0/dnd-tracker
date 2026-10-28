import { ParticipantSourceType } from "@/lib/constants/battle";
import { isFiveE } from "@/lib/utils/battle/attack/ability";
import { type SpellDice, spellDice, spellDice5e } from "@/lib/utils/spells/model/dice";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant } from "@/types/battle";

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
export function spellFormulaLabel(caster: BattleParticipant, spell: Parameters<typeof casterSpellDice>[1], castLevel?: number): string {
  const { count, sides } = casterSpellDice(caster, spell, castLevel);

  return count === 0 ? "без кубиків" : `${count}к${sides}`;
}

const diceLabel = (dice: string) => dice.replace("d", "к");

/** Сила заклинання без кубиків каста: діапазон byDistance або кубики лікування варіантів; "" — шкоди/лікування немає. */
export function spellEffectsFormula(effects: SpellEffect[]): string {
  const list = effects.flatMap((e) => (e.kind === "chooseOne" ? e.options : [e]));

  const ranges = list.flatMap((e) => (e.kind === "dealDamage" && e.byDistance ? [e.byDistance] : []))[0];

  if (ranges) return `${diceLabel(ranges[0].dice)}…${diceLabel(ranges[ranges.length - 1].dice)}`;

  const heals = [...new Set(list.flatMap((e) => (e.kind === "heal" && typeof e.amount === "string" ? [diceLabel(e.amount)] : [])))];

  if (heals.length > 0) return heals.join(" / ");

  return list.some((e) => e.kind === "dealDamage" || e.kind === "heal") ? "без кубиків" : "";
}
