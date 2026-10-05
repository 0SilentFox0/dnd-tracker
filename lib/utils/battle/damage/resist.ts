/**
 * Застосування резисту до урону (для breakdown / preview)
 */

import { getCombinedResistancePercent } from "../resistance";

import type { BattleParticipant } from "@/types/battle";

export function applyResistance(
  damage: number,
  defender: BattleParticipant,
  damageCategory: "physical" | "spell" = "physical",
  participants: BattleParticipant[] = [defender],
): {
  finalDamage: number;
  resistPercent: number;
  resistMessage: string | null;
} {
  const resistPercent = getCombinedResistancePercent(defender, damageCategory, { participants });

  if (resistPercent <= 0) {
    return { finalDamage: damage, resistPercent: 0, resistMessage: null };
  }

  const reduction = Math.floor(damage * (resistPercent / 100));

  const finalDamage = Math.max(0, damage - reduction);

  const resistMessage = `🛡 ${defender.basicInfo.name}: ${resistPercent}% резист (−${reduction} урону)`;

  return { finalDamage, resistPercent, resistMessage };
}
