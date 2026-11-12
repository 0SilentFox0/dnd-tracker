import { displayEffects } from "./personal-effects";
import { collapseSystemConditions, type DisplayEffect } from "./system-conditions";

import type { Ruleset } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export interface ParticipantFace {
  name: string;
  avatar?: string;
}

/** Спільний порожній список: учасник без ефектів не ламає memo-рядки новим `[]`. */
export const NO_EFFECTS: readonly ActiveEffect[] = Object.freeze([]);

/** Список ефектів лишається тим самим масивом, поки його вміст не змінився, — memo-рядки не перемальовуються. */
export function buildDisplayEffects(order: BattleParticipant[], prev?: Map<string, DisplayEffect[]>, rules?: Ruleset): Map<string, DisplayEffect[]> {
  const system = rules ? ruleSystemOf(rules) : undefined;

  const conditions = system?.conditions;

  return new Map(
    order.map((p) => {
      const levels = conditions?.list(p);

      const all = displayEffects(p, order);

      const collapsed = levels?.length ? collapseSystemConditions(all, levels) : all;

      const badge = system?.magic.tested?.badge(p);

      const list = badge ? [...collapsed, badge] : collapsed;

      const before = prev?.get(p.basicInfo.id);

      return [p.basicInfo.id, before && JSON.stringify(before) === JSON.stringify(list) ? before : list];
    }),
  );
}

export function buildParticipantFaces(order: BattleParticipant[]): Map<string, ParticipantFace> {
  return new Map(order.map((p) => [p.basicInfo.id, { name: p.basicInfo.name, avatar: p.basicInfo.avatar }]));
}
