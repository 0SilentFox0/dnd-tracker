import { displayEffects } from "./personal-effects";

import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export interface ParticipantFace {
  name: string;
  avatar?: string;
}

/** Список ефектів лишається тим самим масивом, поки його вміст не змінився, — memo-рядки не перемальовуються. */
export function buildDisplayEffects(order: BattleParticipant[], prev?: Map<string, ActiveEffect[]>): Map<string, ActiveEffect[]> {
  return new Map(
    order.map((p) => {
      const list = displayEffects(p, order);

      const before = prev?.get(p.basicInfo.id);

      return [p.basicInfo.id, before && JSON.stringify(before) === JSON.stringify(list) ? before : list];
    }),
  );
}

export function buildParticipantFaces(order: BattleParticipant[]): Map<string, ParticipantFace> {
  return new Map(order.map((p) => [p.basicInfo.id, { name: p.basicInfo.name, avatar: p.basicInfo.avatar }]));
}
