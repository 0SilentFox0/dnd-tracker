import { WFRP_CONDITION_KEYS, WFRP_CONDITION_REGISTRY } from "./catalog";
import { conditionLevel } from "./levels";

import type { BattleParticipant } from "@/types/battle";

const levelsOf = (p: BattleParticipant | undefined) => (p?.battleData?.activeEffects ? WFRP_CONDITION_KEYS.map((key) => ({ key, level: conditionLevel(p, key) })).filter((c) => c.level > 0) : []);

export function selfTestMod(p: BattleParticipant | undefined, kind: "attack" | "test"): number {
  return levelsOf(p).reduce((sum, { key, level }) => {
    const mod = WFRP_CONDITION_REGISTRY[key].testMod;

    return sum + (mod?.self?.(level) ?? 0) + (kind === "attack" ? (mod?.selfAttack ?? 0) : 0);
  }, 0);
}

export function againstMod(target: BattleParticipant, attackKind: "melee" | "ranged"): number {
  return levelsOf(target).reduce((sum, { key }) => {
    const against = WFRP_CONDITION_REGISTRY[key].testMod?.against;

    return sum + (against?.all ?? 0) + (attackKind === "melee" ? (against?.melee ?? 0) : 0);
  }, 0);
}
