import type { ManeuverResult } from "./types";

import { resolveAmount } from "@/lib/utils/abilities/engine/core/amount";
import { findParticipant, isActive, isTargetable } from "@/lib/utils/abilities/engine/core/participants";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { dealResistedDamage } from "@/lib/utils/battle/damage/resisted-ability-damage";
import type { BattleParticipant } from "@/types/battle";

export const unchanged = (participants: BattleParticipant[], messages: string[] = []): ManeuverResult => ({ participants, messages, downed: [] });

export function attackShare(owner: BattleParticipant, ps: BattleParticipant[], percent: number, rng: Rng): number {
  return resolveAmount({ percentOf: "ownerAttack", value: percent }, { owner, rng, participants: ps });
}

export function isEnemyOf(actor: BattleParticipant) {
  return (p: BattleParticipant) => p.basicInfo.side !== actor.basicInfo.side && isTargetable(p);
}

export function pickedEnemies(ps: BattleParticipant[], actor: BattleParticipant, ids: string[], max: number): BattleParticipant[] {
  return [...new Set(ids)].slice(0, max).flatMap((id) => findParticipant(ps, id) ?? []).filter(isEnemyOf(actor));
}

export function strikeAll(acc: ManeuverResult, hits: { targetId: string; amount: number }[], hit: { actorId: string; damageType: string; name: string; note?: (id: string) => string }): ManeuverResult {
  return hits.reduce<ManeuverResult>((r, { targetId, amount }) => {
    const dealt = dealResistedDamage(r.participants, targetId, amount, hit.damageType, hit.name);

    const after = findParticipant(dealt.participants, targetId);

    const fell = after && !isActive(after) && isActive(findParticipant(r.participants, targetId) ?? after);

    return {
      participants: dealt.participants,
      messages: dealt.message ? [...r.messages, `${dealt.message}${hit.note?.(targetId) ?? ""}`] : r.messages,
      downed: fell ? [...r.downed, { victimId: targetId, actorId: hit.actorId }] : r.downed,
    };
  }, acc);
}

export function primaryDamageType(p: BattleParticipant): string {
  return p.battleData.attacks?.[0]?.damageType ?? "bludgeoning";
}
