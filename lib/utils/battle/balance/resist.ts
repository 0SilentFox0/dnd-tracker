import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import { getCombinedResistancePercent } from "@/lib/utils/battle/resistance";
import type { BattleParticipant } from "@/types/battle";

export const SPELL_DAMAGE_KEY = "spell";

const WEAPON_KINDS = ["melee", "ranged"] as const;

const DAMAGE_TYPES = [...DAMAGE_ELEMENT_OPTIONS.map((o) => o.value as string), "physical"];

export const damageKey = (attackKind: string, damageType: string | undefined) => `${attackKind}:${damageType || "physical"}`;

/** Non-zero resistance percents (negative = vulnerability) as the engine reads them: `melee:piercing`, `ranged:fire`, …, and `spell` for spell damage. */
export function unitResistances(p: BattleParticipant): Record<string, number> {
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
