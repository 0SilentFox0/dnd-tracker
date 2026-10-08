import { CombatStatus } from "@/lib/constants/battle";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export function isUp(p: BattleParticipant): boolean {
  return p.combatStats.status === CombatStatus.ACTIVE && p.combatStats.currentHp > 0;
}

export function isDown(p: BattleParticipant): boolean {
  return !isUp(p);
}

export function findEffectMarker(p: BattleParticipant, type: string): { effect: ActiveEffect; value: number } | undefined {
  for (const effect of p.battleData.activeEffects) {
    const marker = effect.effects.find((d) => d.type === type);

    if (marker) return { effect, value: marker.value };
  }

  return undefined;
}

export function hasEffectMarker(p: BattleParticipant, type: string): boolean {
  return findEffectMarker(p, type) !== undefined;
}
