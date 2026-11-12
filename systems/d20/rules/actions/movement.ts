import { resolveOpportunityAttacks } from "../reactions/opportunity";
import { planDrag } from "./grapple";

import { textRef } from "@/lib/i18n/text-ref";
import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { actionReason } from "@/lib/utils/battle/actions/reasons";
import type { MovementInput, MovementResult } from "@/lib/utils/battle/actions/types";
import { releaseGrapples } from "@/lib/utils/battle/conditions/grapple-links";
import { battleActionToEvent, type NewBattleEvent } from "@/lib/utils/battle/store";
import { ruleErrorOf } from "@/lib/utils/battle/store/errors";
import type { LogLine } from "@/types/text";

export function resolveMovement(input: MovementInput): MovementResult {
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
      ? resolveOpportunityAttacks({ strike: input.strike, participants, moverId: mover.basicInfo.id, path, start, map, round: input.round, battleId: input.battleId, rules, rng: input.rng, sceneState: input.sceneState })
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
    const out = releaseGrapples(base, mover.basicInfo.id, textRef("battleActions.grapple.reasons.noRoom"), id);

    base = out.participants;
    messages.push(...out.messages);
  }

  const dragged = plan?.targets ?? [];

  if (dragged.length) {
    spent = cost * 2;

    if (spent > budget) throw ruleErrorOf("action_rejected", actionReason("dragNoMovement"));
  }

  const moved = { ...current, battleData: { ...current.battleData, position: destination, movementUsed: (mover.battleData.movementUsed ?? 0) + spent } };

  let after = replaceParticipant(base, moved);

  for (const { id, cell } of dragged) {
    const t = findParticipant(after, id);

    if (t) after = replaceParticipant(after, { ...t, battleData: { ...t.battleData, position: cell } });
  }

  return { participants: after, moved, destination, spent, messages, events, sceneState: opportunity?.sceneState ?? input.sceneState };
}
