/**
 * Застосування резисту до урону (для breakdown / preview)
 */

import { getParticipantExtras } from "../participant";

import type { BattleParticipant } from "@/types/battle";

export function applyResistance(
  damage: number,
  defender: BattleParticipant,
  damageCategory: "physical" | "spell" = "physical",
): {
  finalDamage: number;
  resistPercent: number;
  resistMessage: string | null;
} {
  const extras = getParticipantExtras(defender);

  const resistances = extras.resistances;

  if (!resistances) {
    return { finalDamage: damage, resistPercent: 0, resistMessage: null };
  }

  let resistPercent = 0;

  if (damageCategory === "physical") {
    resistPercent = resistances.physical ?? 0;
  } else if (damageCategory === "spell") {
    resistPercent = resistances.spell ?? 0;
  }

  if (resistPercent <= 0) {
    return { finalDamage: damage, resistPercent: 0, resistMessage: null };
  }

  const reduction = Math.floor(damage * (resistPercent / 100));

  const finalDamage = Math.max(0, damage - reduction);

  const resistMessage = `🛡 ${defender.basicInfo.name}: ${resistPercent}% резист (−${reduction} урону)`;

  return { finalDamage, resistPercent, resistMessage };
}
