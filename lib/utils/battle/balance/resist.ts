import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import { applyAuraZone, areaAuras } from "@/lib/utils/abilities/engine/area-aura";
import { getCombinedResistancePercent } from "@/lib/utils/battle/resistance";
import type { BattleParticipant } from "@/types/battle";

export const SPELL_DAMAGE_KEY = "spell";

const WEAPON_KINDS = ["melee", "ranged"] as const;

const DAMAGE_TYPES = [...DAMAGE_ELEMENT_OPTIONS.map((o) => o.value as string), "physical"];

export const damageKey = (attackKind: string, damageType: string | undefined) => `${attackKind}:${damageType || "physical"}`;

/** Non-zero resistance percents (negative = vulnerability) as the engine reads them: `melee:piercing`, `ranged:fire`, …, and `spell` for spell damage. */
export function unitResistances(unit: BattleParticipant): Record<string, number> {
  // власник завжди в своїй зоні союзників (zoneCandidates), тож її опір рахується; зона ворогів на нього не діє
  const p = areaAuras(unit)
    .filter((a) => a.target === "nearbyAllies")
    .reduce((acc, a) => applyAuraZone([acc], acc, a, [acc.basicInfo.id], 0)[0], unit);

  const out: Record<string, number> = {};

  for (const kind of WEAPON_KINDS) {
    for (const type of DAMAGE_TYPES) {
      const percent = getCombinedResistancePercent(p, type, { attackKind: kind });

      if (percent !== 0) out[damageKey(kind, type)] = percent;
    }
  }

  const spell = getCombinedResistancePercent(p, SPELL_DAMAGE_KEY, { fromSpell: true });

  if (spell !== 0) out[SPELL_DAMAGE_KEY] = spell;

  return out;
}
