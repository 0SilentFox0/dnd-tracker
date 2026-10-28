import { parseDice } from "@/lib/utils/common/dice";
import type { BattleAttack, DamageStep } from "@/types/battle";

export const WEAPON_FLAT_LABEL = "Бонус зброї";

/** «+N» формули зброї й +N магічного предмета: кубики рівня героя їх не містять (`mergeDiceFormulas` відкидає flat). */
export function weaponFlatOf(attack: BattleAttack): number {
  return (parseDice(attack.damageDice ?? "")?.flat ?? 0) + (attack.damageBonus ?? 0);
}

export function applyWeaponFlat(damage: number, attack: BattleAttack): { damage: number; step?: DamageStep; line?: string } {
  const flat = weaponFlatOf(attack);

  if (flat === 0) return { damage };

  const after = damage + flat;

  return {
    damage: after,
    step: { label: WEAPON_FLAT_LABEL, side: "attacker", kind: "flat", value: flat, after },
    line: `${flat > 0 ? "+" : "−"} ${Math.abs(flat)} (${WEAPON_FLAT_LABEL.toLowerCase()}) = ${after}`,
  };
}
