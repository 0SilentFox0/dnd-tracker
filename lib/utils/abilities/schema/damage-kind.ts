import type { DamageFilterKind } from "./common";

export function legacyDamageKindOf(type: string): DamageFilterKind | null {
  const s = type.toLowerCase();

  if (s === "all_damage") return "all";

  if (!s.includes("damage") || s.includes("reduction")) return null;

  if (s.includes("melee")) return "melee";

  if (s.includes("ranged")) return "ranged";

  if (s.includes("physical")) return "physical";

  if (s === "spell_damage" || s === "magic_damage" || s.endsWith("_spell_damage") || s.includes("magic")) return "magic";

  return null;
}
