import { ruleRow, totalRow } from "./rows";

import { textRef } from "@/lib/i18n/text-ref";
import { parseDice } from "@/lib/utils/common/dice";
import type { BattleAttack, DamageRow, DamageStep } from "@/types/battle";

export const WEAPON_FLAT_LABEL = textRef("battleLog.damage.steps.weaponBonus");

/** «+N» формули зброї й +N магічного предмета: кубики рівня героя їх не містять (`mergeDiceFormulas` відкидає flat). */
export function weaponFlatOf(attack: BattleAttack): number {
  return (parseDice(attack.damageDice ?? "")?.flat ?? 0) + (attack.damageBonus ?? 0);
}

export function applyWeaponFlat(damage: number, attack: BattleAttack): { damage: number; step?: DamageStep; rows?: DamageRow[] } {
  const flat = weaponFlatOf(attack);

  if (flat === 0) return { damage };

  const after = damage + flat;

  return {
    damage: after,
    step: { label: WEAPON_FLAT_LABEL, side: "attacker", kind: "flat", value: flat, after },
    rows: [ruleRow(), totalRow(textRef("battleLog.damage.rows.weaponBonus"), `${flat > 0 ? "+" : "−"}${Math.abs(flat)} → ${after}`)],
  };
}
