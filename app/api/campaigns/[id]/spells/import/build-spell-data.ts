import type { Prisma } from "@prisma/client";

import { damageDiceColumns } from "./damage-dice-columns";
import type { ImportedSpell } from "./import-spells-schema";

/** CSV exports carry the school either as `school` or as a capitalised `School` column. */
export function spellSchool(spell: ImportedSpell): string | undefined {
  const school = spell.school ?? (spell as Record<string, unknown>).School;

  return typeof school === "string" && school ? school : undefined;
}

export function buildSpellData(
  campaignId: string,
  spell: ImportedSpell,
  schoolGroups: Record<string, string>,
  defaultGroupId: string | undefined,
): Prisma.SpellCreateManyInput {
  const school = spellSchool(spell);

  const { diceCount, diceType } = damageDiceColumns(spell.damageDice);

  return {
    campaignId,
    name: spell.name,
    level: spell.level,
    type: spell.type,
    damageType: spell.damageType,
    damageElement: spell.damageElement || null,
    castingTime: spell.castingTime || null,
    range: spell.range || null,
    components: spell.components || null,
    duration: spell.duration || null,
    concentration: spell.concentration ?? false,
    diceCount,
    diceType,
    savingThrow: spell.savingThrowAbility
      ? ({ ability: spell.savingThrowAbility, onSuccess: spell.savingThrowOnSuccess || "half" } as unknown as Prisma.InputJsonValue)
      : undefined,
    description: spell.description,
    icon: spell.icon ?? null,
    groupId: spell.groupId || (school ? schoolGroups[school] : undefined) || defaultGroupId || null,
  };
}
