import type { Spell } from "@prisma/client";

import type { BattleSpell } from "@/lib/utils/battle/spell";

/** Перетворює DB Spell row на runtime BattleSpell для processSpell. */
export function mapDbSpellToBattleSpell(
  spellData: Spell,
): BattleSpell {
  return {
    id: spellData.id,
    name: spellData.name,
    level: spellData.level,
    type: spellData.type as "target" | "aoe" | "no_target",
    target: spellData.target as "enemies" | "allies" | "all" | undefined,
    damageType: spellData.damageType as "damage" | "heal" | "all",
    damageElement: spellData.damageElement,
    groupId: spellData.groupId ?? null,
    damageModifier: spellData.damageModifier,
    healModifier: spellData.healModifier,
    diceCount: spellData.diceCount,
    diceType: spellData.diceType,
    savingThrow: spellData.savingThrow as
      | { ability: string; onSuccess: "half" | "none"; dc?: number }
      | null,
    hitCheck:
      (spellData.hitCheck as { ability: string; dc: number } | null) ??
      undefined,
    description: spellData.description ?? "",
    duration: spellData.duration,
    castingTime: spellData.castingTime,
    effects: Array.isArray(spellData.effects)
      ? spellData.effects.filter((e): e is string => typeof e === "string")
      : undefined,
    damageDistribution: Array.isArray(spellData.damageDistribution)
      ? (spellData.damageDistribution as unknown[]).filter(
          (n): n is number => typeof n === "number",
        )
      : null,
    effectDetails:
      (spellData.effectDetails as BattleSpell["effectDetails"]) ?? undefined,
    icon: spellData.icon ?? undefined,
  };
}
