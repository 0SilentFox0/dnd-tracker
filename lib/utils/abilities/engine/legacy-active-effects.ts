import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { legacyDamageKindOf } from "@/lib/utils/abilities/schema/damage-kind";
import type { ActiveEffect } from "@/types/battle";

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
        const kind = legacyDamageKindOf(d.type);

        if (kind && value !== 0) out.push({ kind: "damageBonus", filter: { kind }, ...(d.isPercentage ? { percent: value } : { flat: value }) });
      }
    }
  }

  return out;
}
