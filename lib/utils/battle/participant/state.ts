import { CombatStatus, type CombatStatusType, type EffectMarker } from "@/lib/constants/battle";
import type { AnyConditionKey } from "@/lib/utils/abilities/schema/kinds";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export function isUp(p: BattleParticipant): boolean {
  return p.combatStats.status === CombatStatus.ACTIVE && p.combatStats.currentHp > 0;
}

// DM-зміна HP: kill — смерть; 0 HP не «оживляє» мертвого; HP > 0 піднімає непритомного
export function statusForHp(p: BattleParticipant, hp: number, kill = false): CombatStatusType {
  const { status } = p.combatStats;

  if (kill) return CombatStatus.DEAD;

  if (hp <= 0) return status === CombatStatus.DEAD ? CombatStatus.DEAD : CombatStatus.UNCONSCIOUS;

  return status === CombatStatus.UNCONSCIOUS ? CombatStatus.ACTIVE : status;
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

export function hasEffectMarker(p: BattleParticipant, type: EffectMarker | AnyConditionKey): boolean {
  return findEffectMarker(p, type) !== undefined;
}

export function dealsNoDamage(p: BattleParticipant): boolean {
  return hasEffectMarker(p, "no_damage_dealt");
}
