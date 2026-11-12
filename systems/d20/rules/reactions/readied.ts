import { pickMeleeAttack,reactionBlocker } from "./reaction";

import { findParticipant, isAttackable, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { reject } from "@/lib/utils/battle/actions/errors";
import { actionReason } from "@/lib/utils/battle/actions/reasons";
import type { RunCoreActionInput, RunCoreActionResult } from "@/lib/utils/battle/actions/types";
import { assertAttackAllowed } from "@/lib/utils/battle/attack/assert-allowed";
import { getDisabledAttackKinds } from "@/lib/utils/battle/attack/disabled-attacks";
import { type ActionFlow } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { attackReachError } from "@/lib/utils/battle/grid/attack-reach";
import { isHostile } from "@/lib/utils/battle/modes/engine";
import type { BattleParticipant } from "@/types/battle";

export function readiedAttack(input: RunCoreActionInput, actor: BattleParticipant, targetId: string): RunCoreActionResult {
  const { participants, map, round, rng, rules } = input;

  if (!actor.battleData.readied) return reject(actionReason("readiedMissing"));

  const blocker = reactionBlocker(actor);

  if (blocker) return reject(blocker);

  const target = findParticipant(participants, targetId);

  if (!target || !isHostile(map, actor, target) || !isAttackable(target)) return reject(actionReason("enemyRequired"));

  const disabled = getDisabledAttackKinds(actor);

  const attack = pickMeleeAttack(actor) ?? actor.battleData.attacks.find((a) => a.hand !== "off" && !disabled[attackKindOf(a.type)]);

  if (!attack) return reject(actionReason("noAttack"));

  assertAttackAllowed(actor, attack, [target]);

  const reach = attackReachError(map, participants, actor, attack, [target], rules);

  if (reach) return reject(reach);

  const flow: ActionFlow = { ps: participants, messages: [], summons: [], ctx: { round, rng, map, rules }, sceneState: input.sceneState };

  const { battleAction } = input.strike({ flow, attackerId: actor.basicInfo.id, targetId, attack, currentRound: round, battleId: input.battleId, rng, label: "readied" });

  const fresh = findParticipant(flow.ps, actor.basicInfo.id) ?? actor;

  const spent = { ...fresh, battleData: { ...fresh.battleData, readied: undefined }, actionFlags: { ...fresh.actionFlags, hasUsedReaction: true } };

  return { participants: replaceParticipant(flow.ps, spent), messages: [], actions: [battleAction], sceneState: flow.sceneState };
}
