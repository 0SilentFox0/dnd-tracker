import { planDrag } from "./grapple";
import { resolveOpportunityAttacks } from "./opportunity";

import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { releaseGrapples } from "@/lib/utils/battle/conditions/grapple-links";
import { battleActionToEvent, type NewBattleEvent } from "@/lib/utils/battle/store";
import { BattleRuleError } from "@/lib/utils/battle/store/errors";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface Movement5eInput {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  mover: BattleParticipant;
  to: GridPoint;
  path: GridPoint[] | null;
  budget: number;
  cost: number;
  round: number;
  battleId: string;
  rules: Ruleset;
  rng: () => number;
}

export interface Movement5eResult {
  participants: BattleParticipant[];
  moved: BattleParticipant;
  destination: GridPoint;
  spent: number;
  messages: LogLine[];
  events: NewBattleEvent[];
}

export function resolveMovement5e(input: Movement5eInput): Movement5eResult {
  const { map, participants, mover, to, path, budget, cost, rules } = input;

  const messages: LogLine[] = [];

  const events: NewBattleEvent[] = [];

  let base = participants;

  let current = mover;

  let destination = to;

  let spent = cost;

  const start = mover.battleData.position;

  const opportunity =
    rules.actions.opportunityAttacks && path && start
      ? resolveOpportunityAttacks({ participants, moverId: mover.basicInfo.id, path, start, map, round: input.round, battleId: input.battleId, rules, rng: input.rng })
      : null;

  if (opportunity) {
    base = opportunity.participants;
    current = findParticipant(base, mover.basicInfo.id) ?? mover;
    messages.push(...opportunity.messages);
    events.push(...opportunity.actions.map(battleActionToEvent));

    if (opportunity.stopAt) {
      destination = opportunity.stopAt;
      spent = opportunity.cost;
    }
  }

  const plan = opportunity?.stopAt ? null : planDrag({ map, participants, mover, to, path });

  for (const id of plan?.blocked ?? []) {
    const out = releaseGrapples(base, mover.basicInfo.id, "немає місця", id);

    base = out.participants;
    messages.push(...out.messages);
  }

  const dragged = plan?.targets ?? [];

  if (dragged.length) {
    spent = cost * 2;

    if (spent > budget) throw new BattleRuleError("action_rejected", "Не вистачає руху, щоб тягнути схоплену ціль");
  }

  const moved = { ...current, battleData: { ...current.battleData, position: destination, movementUsed: (mover.battleData.movementUsed ?? 0) + spent } };

  let after = replaceParticipant(base, moved);

  for (const { id, cell } of dragged) {
    const t = findParticipant(after, id);

    if (t) after = replaceParticipant(after, { ...t, battleData: { ...t.battleData, position: cell } });
  }

  return { participants: after, moved, destination, spent, messages, events };
}
