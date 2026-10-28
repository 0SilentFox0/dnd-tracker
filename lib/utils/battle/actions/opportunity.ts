import { canReact, pickMeleeAttack } from "./reaction";

import { findParticipant, isActive } from "@/lib/utils/abilities/engine/core/participants";
import { resolveServerAttack } from "@/lib/utils/battle/attack/server-attack";
import { type ActionFlow, put } from "@/lib/utils/battle/common/action-flow";
import { conditionSourceIds } from "@/lib/utils/battle/conditions";
import { cellsOf, footprint, footprintDistance, isOnMap, sizeOf } from "@/lib/utils/battle/grid";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleAction, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export interface OpportunityInput {
  participants: BattleParticipant[];
  moverId: string;
  path: GridPoint[];
  start: GridPoint;
  map: BattleMapConfig;
  round: number;
  battleId: string;
  rules: Ruleset;
  rng: () => number;
}

export interface OpportunityResult {
  participants: BattleParticipant[];
  stopAt: GridPoint | null;
  cost: number;
  actions: BattleAction[];
  messages: string[];
}

const canProvoke = (e: BattleParticipant, moverId: string) => canReact(e) && isOnMap(e) && !conditionSourceIds(e, "charmed").includes(moverId);

/** `stopAt` — клітинка, де мувер упав. */
export function resolveOpportunityAttacks(input: OpportunityInput): OpportunityResult {
  const { moverId, path, start, round, battleId, rules, rng } = input;

  const flow: ActionFlow = { ps: input.participants, messages: [], summons: [], ctx: { round, rng, map: input.map, rules } };

  const actions: BattleAction[] = [];

  const messages: string[] = [];

  const mover0 = findParticipant(flow.ps, moverId);

  if (!mover0 || hasEffectMarker(mover0, "disengaged")) return { participants: flow.ps, stopAt: null, cost: path.length, actions, messages };

  const size = sizeOf(mover0);

  const enemies = flow.ps.filter((p) => p.basicInfo.side !== mover0.basicInfo.side && isOnMap(p)).map((p) => ({ id: p.basicInfo.id, reach: cellsOf(p) }));

  let fromCells = footprint(start, size);

  for (let i = 0; i < path.length; i++) {
    const from = i === 0 ? start : path[i - 1];

    const toCells = footprint(path[i], size);

    for (const { id, reach } of enemies) {
      if (footprintDistance(fromCells, reach) > 1 || footprintDistance(toCells, reach) <= 1) continue;

      const e = findParticipant(flow.ps, id);

      if (!e || !canProvoke(e, moverId)) continue;

      const attack = pickMeleeAttack(e);

      if (!attack) continue;

      const mover = findParticipant(flow.ps, moverId) ?? mover0;

      put(flow, { ...mover, battleData: { ...mover.battleData, position: from } });
      put(flow, { ...e, actionFlags: { ...e.actionFlags, hasUsedReaction: true } });

      messages.push(`⚔ Атака при відході: ${e.basicInfo.name} → ${mover.basicInfo.name}`);

      const { battleAction } = resolveServerAttack({ flow, attackerId: id, targetId: moverId, attack, currentRound: round, battleId, rng, label: "opportunity" });

      actions.push(battleAction);

      const after = findParticipant(flow.ps, moverId);

      if (!after || !isActive(after)) {
        messages.push(...flow.messages);

        return { participants: flow.ps, stopAt: from, cost: i, actions, messages };
      }
    }

    fromCells = toCells;
  }

  messages.push(...flow.messages);

  return { participants: flow.ps, stopAt: null, cost: path.length, actions, messages };
}
