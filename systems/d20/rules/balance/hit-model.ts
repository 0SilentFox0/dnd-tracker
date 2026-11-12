import { REF_HERO_HIT, REF_UNIT_HIT } from "@/lib/constants/battle-balance";
import { hitChance } from "@/lib/utils/battle/balance/hit-chance";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { diceAverage } from "@/lib/utils/common/dice";
import type { RuleSystemCombat } from "@/lib/utils/rules/systems/types";
import type { BattleParticipant } from "@/types/battle";

const attacksOf = (p: BattleParticipant) => p.battleData.attacks ?? [];

// offense/defense/damage are required by the contract but only read for non-d20 hit models; d20 balance uses winChance/refHit
export const d20HitModel: RuleSystemCombat["hitModel"] = {
  offense: (p) => attacksOf(p).reduce((best, a) => Math.max(best, a.attackBonus), 0),
  defense: (p) => getEffectiveArmorClass(p),
  winChance: hitChance,
  damage: (p) => attacksOf(p).reduce((best, a) => Math.max(best, diceAverage(a.damageDice || "0") + (a.damageBonus ?? 0)), 0),
  refHit: REF_HERO_HIT,
  refHitUnit: REF_UNIT_HIT,
};
