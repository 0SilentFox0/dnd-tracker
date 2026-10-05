import type { DamageFilterKind, StaticEffect } from "@/lib/utils/abilities/schema";
import type { ActiveEffect } from "@/types/battle";

function legacyDamageKind(type: string): DamageFilterKind | null {
  const s = type.toLowerCase();

  if (s === "all_damage") return "all";

  if (!s.includes("damage") || s.includes("reduction")) return null;

  if (s.includes("melee")) return "melee";

  if (s.includes("ranged")) return "ranged";

  if (s.includes("physical")) return "physical";

  if (s === "spell_damage" || s === "magic_damage" || s.endsWith("_spell_damage") || s.includes("magic")) return "magic";

  return null;
}

export function legacyActiveEffectModifiers(ae: ActiveEffect): StaticEffect[] {
  const out: StaticEffect[] = [];

  for (const d of ae.effects) {
    const value = typeof d.value === "number" ? d.value : 0;

    switch (d.type) {
      case "ac_bonus":
        out.push({ kind: "modifyStat", stat: "armor", flat: value });
        break;
      case "attack_bonus":
      case "attack":
        out.push({ kind: "modifyStat", stat: "attackBonus", flat: value });
        break;
      case "initiative_bonus":
      case "initiative":
        out.push({ kind: "modifyStat", stat: "initiative", flat: value });
        break;
      case "advantage":
      case "advantage_attack":
        out.push({ kind: "flag", flag: "advantage", attackKind: "all" });
        break;
      case "disadvantage_attack":
        out.push({ kind: "flag", flag: "disadvantage" });
        break;
      default: {
        const kind = legacyDamageKind(d.type);

        if (kind && value !== 0) out.push({ kind: "damageBonus", filter: { kind }, ...(d.isPercentage ? { percent: value } : { flat: value }) });
      }
    }
  }

  return out;
}
