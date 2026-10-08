import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export const effectKey = (participantId: string, effectId: string) => `${participantId}:${effectId}`;

export function activeEffectIds(ps: BattleParticipant[]): Set<string> {
  return new Set(ps.flatMap((p) => p.battleData.activeEffects.map((e) => effectKey(p.basicInfo.id, e.id))));
}

export const withoutEffects = (p: BattleParticipant, drop: (e: ActiveEffect) => boolean): BattleParticipant => {
  if (!p.battleData.activeEffects.some(drop)) return p;

  return { ...p, battleData: { ...p.battleData, activeEffects: p.battleData.activeEffects.filter((e) => !drop(e)) } };
};

export function consumeAttackEffects(
  ps: BattleParticipant[],
  a: { attackerId: string; targetId: string; hit: boolean; existedBefore: Set<string> },
): BattleParticipant[] {
  return ps.map((p) => {
    const id = p.basicInfo.id;

    if (id === a.attackerId) {
      return withoutEffects(p, (e) => a.existedBefore.has(effectKey(id, e.id)) && (e.consumeOn === "ownAttack" || (a.hit && e.consumeOn === "ownHit")));
    }

    if (id === a.targetId) return withoutEffects(p, (e) => a.existedBefore.has(effectKey(id, e.id)) && e.consumeOn === "attackAgainst");

    return p;
  });
}
