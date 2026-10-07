import type { DamageFilterKind } from "./common";

import { AttackType } from "@/lib/constants/battle";

export function legacyDamageKindOf(type: string): DamageFilterKind | null {
  const s = type.toLowerCase();

  if (s === "all_damage") return "all";

  if (!s.includes("damage") || s.includes("reduction")) return null;

  if (s.includes(AttackType.MELEE)) return AttackType.MELEE;

  if (s.includes(AttackType.RANGED)) return AttackType.RANGED;

  if (s.includes("physical")) return "physical";

  if (s === "spell_damage" || s === "magic_damage" || s.endsWith("_spell_damage") || s.includes("magic")) return "magic";

  return null;
}
