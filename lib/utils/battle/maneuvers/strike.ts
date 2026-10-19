import type { ManeuverResult } from "./types";

import { resolveAmount } from "@/lib/utils/abilities/engine/core/amount";
import { findParticipant, isTargetable } from "@/lib/utils/abilities/engine/core/participants";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { dealResistedHits, type ResistedHit } from "@/lib/utils/battle/damage/resisted-ability-damage";
import type { BattleParticipant } from "@/types/battle";

export const maneuverResult = (participants: BattleParticipant[], messages: string[] = []): ManeuverResult => ({ participants, messages, downed: [] });

export function attackShare(owner: BattleParticipant, ps: BattleParticipant[], percent: number, rng: Rng): number {
  return resolveAmount({ percentOf: "ownerAttack", value: percent }, { owner, rng, participants: ps });
}

export function isEnemyOf(actor: BattleParticipant) {
  return (p: BattleParticipant) => p.basicInfo.side !== actor.basicInfo.side && isTargetable(p);
}

export function pickedEnemies(ps: BattleParticipant[], actor: BattleParticipant, ids: string[], max: number): BattleParticipant[] {
  return [...new Set(ids)].slice(0, max).flatMap((id) => findParticipant(ps, id) ?? []).filter(isEnemyOf(actor));
}

export function strikeAll(acc: ManeuverResult, hits: ResistedHit[], hit: { actorId: string; damageType: string; name: string; note?: (id: string) => string }): ManeuverResult {
  const r = dealResistedHits(acc.participants, hits, hit);

  const lines = r.results.map(({ targetId, dealt }) => `💥 ${hit.name}: ${findParticipant(r.participants, targetId)?.basicInfo.name} −${dealt} HP${hit.note?.(targetId) ?? ""}`);

  return { participants: r.participants, messages: [...acc.messages, ...lines], downed: [...acc.downed, ...r.downed] };
}

export function primaryDamageType(p: BattleParticipant): string {
  return p.battleData.attacks?.[0]?.damageType ?? "bludgeoning";
}
