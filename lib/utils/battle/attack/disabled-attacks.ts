import type { BattleParticipant } from "@/types/battle";

export function getDisabledAttackKinds(p: BattleParticipant): { melee: boolean; ranged: boolean } {
  const has = (type: string) => p.battleData.activeEffects.some((e) => e.effects.some((d) => d.type === type));

  return { melee: has("disable_melee_attacks"), ranged: has("disable_ranged_attacks") };
}
