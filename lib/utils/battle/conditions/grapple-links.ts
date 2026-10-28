import { removeEffects } from "./query";

import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleParticipant } from "@/types/battle";

export const GRAPPLE_KEY_PREFIX = "core:grapple:";

export const grappleKey = (grapplerId: string) => `${GRAPPLE_KEY_PREFIX}${grapplerId}`;

export function grappledBy(ps: BattleParticipant[], grapplerId: string): BattleParticipant[] {
  return ps.filter((p) => p.battleData.activeEffects.some((e) => e.abilityKey === grappleKey(grapplerId)));
}

export function releaseGrapples(ps: BattleParticipant[], grapplerId: string, reason: string, only?: string): { participants: BattleParticipant[]; messages: string[] } {
  const grappler = findParticipant(ps, grapplerId);

  let next = ps;

  const messages: string[] = [];

  for (const target of grappledBy(ps, grapplerId)) {
    if (only && target.basicInfo.id !== only) continue;

    const { participant } = removeEffects(target, (e) => e.abilityKey === grappleKey(grapplerId));

    next = replaceParticipant(next, participant);
    messages.push(`🤲 ${grappler?.basicInfo.name ?? "Схоплювач"} відпускає ${target.basicInfo.name}${reason ? ` (${reason})` : ""}`);
  }

  return { participants: next, messages };
}
