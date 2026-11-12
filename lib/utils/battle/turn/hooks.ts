import { applyPendingMoraleCheck } from "./apply-pending-morale";
import type { PendingMoraleCheckPayload } from "./pending-morale";

import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { TurnAdvanceCtx, TurnHook, TurnHookCtx, TurnHookResult } from "@/lib/utils/rules/systems/types";

/** Runs the hooks in order, each seeing the previous one's participants; stops after a `skipTurn` or `pending` result */
export function runTurnHooks<C extends TurnHookCtx>(list: readonly TurnHook<C>[], ctx: C): TurnHookResult {
  let participants = ctx.participants;

  const out: TurnHookResult = { participants, messages: [] };

  for (const hook of list) {
    const r = hook({ ...ctx, participants });

    participants = r.participants;
    out.participants = participants;
    out.messages.push(...r.messages);

    if (r.actions) out.actions = [...(out.actions ?? []), ...r.actions];

    if (r.downed) out.downed = true;

    if (r.testerIds) out.testerIds = [...(out.testerIds ?? []), ...r.testerIds];

    if (r.skipTurn) out.skipTurn = true;

    if (r.pending) out.pending = true;

    if (r.skipTurn || r.pending) break;
  }

  return out;
}

const pendingMorale: TurnHook<TurnAdvanceCtx> = ({ participants, scene, rules }) => {
  if (!scene.pendingMoraleCheck) return { participants, messages: [] };

  const morale = applyPendingMoraleCheck(participants, scene.pendingMoraleCheck as PendingMoraleCheckPayload, scene.round, scene.id, scene.eventSeq, undefined, rules);

  return { participants: morale.updatedInitiativeOrder, messages: [], actions: morale.moraleLogEntry ? [morale.moraleLogEntry] : [] };
};

export const beforeAdvanceHooks = (rules: TurnAdvanceCtx["rules"]): readonly TurnHook<TurnAdvanceCtx>[] => [pendingMorale, ...(ruleSystemOf(rules).combat.turn?.beforeAdvance ?? [])];
