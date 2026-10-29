import { API_ERRORS } from "@/lib/constants/api-errors";
import { runCoreAction } from "@/lib/utils/battle/actions/run";
import type { CoreActionBody } from "@/lib/utils/battle/actions/schema";
import { requireActor } from "@/lib/utils/battle/common/control";
import { lineText } from "@/lib/utils/battle/log/lines";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { battleActionToEvent, BattleRuleError, systemEvent } from "@/lib/utils/battle/store";
import { assertCanAct } from "@/lib/utils/battle/turn";

function guard(ctx: BattleMutationContext, body: CoreActionBody): void {
  const offTurn = body.action === "readiedAttack";

  const actor = requireActor(ctx, body.participantId, {
    missing: API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE,
    forbidden: offTurn ? "Діяти може лише DM або власник учасника" : "Діяти може лише DM або той, хто зараз ходить",
    inactive: { code: "action_rejected", message: "Учасник не може діяти (непритомний або мертвий)" },
    anyTurn: offTurn,
  });

  if (offTurn) return;

  if (ctx.participants[ctx.scene.turnIndex]?.basicInfo.id !== actor.basicInfo.id) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_NOT_PARTICIPANT_TURN);

  assertCanAct(ctx, actor.basicInfo.id);
}

export function coreActionMutation(ctx: BattleMutationContext, body: CoreActionBody): MutationResult {
  if (!ctx.meta.rules.actions.enabled) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_CORE_ACTIONS_DISABLED);

  guard(ctx, body);

  const out = runCoreAction({
    participants: ctx.participants,
    body,
    map: ctx.meta.map,
    rules: ctx.meta.rules,
    round: ctx.scene.round,
    rng: ctx.rng ?? Math.random,
    battleId: ctx.scene.id,
  });

  const events = [...(out.messages.length ? [systemEvent(ctx.scene.round, lineText(out.messages, "; "))] : []), ...(out.actions ?? []).map(battleActionToEvent)];

  return { participants: out.participants, pending: ctx.pending, events };
}
