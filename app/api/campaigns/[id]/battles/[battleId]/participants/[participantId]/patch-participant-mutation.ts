import type { PatchParticipantData } from "./patch-participant-schema";

import { CombatStatus, DM_ACTOR } from "@/lib/constants/battle";
import { resolveDowned } from "@/lib/utils/abilities/engine/run-abilities";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, battleActionToEvent, BattleRuleError, systemEvent } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import type { BattleParticipant } from "@/types/battle";

const DM_DETAILS = { actorName: DM_ACTOR.actorName, actorSide: DM_ACTOR.actorSide, actionDetails: {} };

export function patchParticipantMutation(
  ctx: BattleMutationContext,
  participantId: string,
  data: PatchParticipantData,
): MutationResult {
  if (data.removeFromBattle === true) return removeParticipant(ctx, participantId);

  if (data.currentHp !== undefined) return updateHp(ctx, participantId, data.currentHp);

  throw new BattleRuleError("action_rejected", "Вкажіть currentHp або removeFromBattle");
}

function removeParticipant(ctx: BattleMutationContext, participantId: string): MutationResult {
  const removedIndex = ctx.participants.findIndex((p) => p.basicInfo.id === participantId);

  if (removedIndex === -1) throw new BattleAccessError(404, "Учасника не знайдено");

  const removed = ctx.participants[removedIndex];

  const participants = ctx.participants.filter((p) => p.basicInfo.id !== participantId);

  const removalEvent: MutationResult["events"][number] = {
    type: "ability",
    round: ctx.scene.round,
    actorId: DM_ACTOR.actorId,
    resultText: `Видалено з бою (DM): ${removed.basicInfo.name}`,
    details: DM_DETAILS,
  };

  const current = ctx.scene.turnIndex;

  // хід був на видаленому — наступний отримує повний початок ходу (а з кінця черги — новий раунд)
  if (removedIndex === current && participants.length > 0) {
    const advanced = advanceTurn({
      participants,
      pending: ctx.pending,
      scene: { ...ctx.scene, turnIndex: removedIndex - 1, pendingMoraleCheck: null },
    });

    return {
      participants: advanced.participants,
      pending: advanced.pending,
      scene: advanced.scene,
      events: [removalEvent, ...advanced.actions.map(battleActionToEvent)],
    };
  }

  let turnIndex = current;

  if (participants.length === 0) {
    turnIndex = 0;
  } else if (removedIndex < current) {
    turnIndex = current - 1;
  }

  turnIndex = Math.min(turnIndex, Math.max(0, participants.length - 1));

  return {
    participants,
    pending: ctx.pending,
    scene: { turnIndex },
    events: [removalEvent],
  };
}

function updateHp(ctx: BattleMutationContext, participantId: string, requestedHp: number): MutationResult {
  const idx = ctx.participants.findIndex((p) => p.basicInfo.id === participantId);

  if (idx === -1) throw new BattleAccessError(404, "Учасника не знайдено");

  const participant = ctx.participants[idx];

  const oldHp = participant.combatStats.currentHp;

  const newHp = Math.min(requestedHp, participant.combatStats.maxHp);

  const updated: BattleParticipant = {
    ...participant,
    combatStats: {
      ...participant.combatStats,
      currentHp: newHp,
      status:
        newHp <= 0
          ? participant.combatStats.status === CombatStatus.DEAD
            ? CombatStatus.DEAD
            : CombatStatus.UNCONSCIOUS
          : participant.combatStats.status === CombatStatus.UNCONSCIOUS
            ? CombatStatus.ACTIVE
            : participant.combatStats.status,
    },
  };

  const order = [...ctx.participants];

  order[idx] = updated;

  const downed = oldHp > 0 && newHp <= 0
    ? resolveDowned(order, { victimId: participantId, actorId: null }, { round: ctx.scene.round, rng: Math.random }, { allowSurvive: false })
    : { participants: order, messages: [] as string[] };

  const name = updated.basicInfo.name;

  const events: MutationResult["events"] = [
    {
      type: "ability",
      round: ctx.scene.round,
      actorId: DM_ACTOR.actorId,
      targets: [{ participantId, participantName: name }],
      hpChanges: [{ participantId, participantName: name, oldHp, newHp, change: oldHp - newHp }],
      resultText: `Зміна HP (DM): ${name}, ${oldHp} → ${newHp}`,
      details: DM_DETAILS,
    },
  ];

  if (downed.messages.length > 0) {
    events.push(systemEvent(ctx.scene.round, downed.messages.join(" | ")));
  }

  return { participants: downed.participants, pending: ctx.pending, events };
}
