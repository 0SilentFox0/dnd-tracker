import type { PatchParticipantData } from "./patch-participant-schema";

import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, battleActionToEvent, BattleRuleError, systemEvent } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import { executeComplexTriggersForChangedParticipant } from "@/lib/utils/skills/execution";
import type { BattleParticipant } from "@/types/battle";

const DM_DETAILS = { actorName: "DM", actorSide: "ally", actionDetails: {} };

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
    actorId: "dm",
    resultText: `DM видалив з бою: ${removed.basicInfo.name}`,
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
          ? participant.combatStats.status === "dead"
            ? "dead"
            : "unconscious"
          : participant.combatStats.status === "unconscious"
            ? "active"
            : participant.combatStats.status,
    },
  };

  const order = [...ctx.participants];

  order[idx] = updated;

  const triggered = executeComplexTriggersForChangedParticipant(order, participantId, ctx.scene.round);

  const name = updated.basicInfo.name;

  const events: MutationResult["events"] = [
    {
      type: "ability",
      round: ctx.scene.round,
      actorId: "dm",
      targets: [{ participantId, participantName: name }],
      hpChanges: [{ participantId, participantName: name, oldHp, newHp, change: oldHp - newHp }],
      resultText: `DM змінив HP ${name}: ${oldHp} → ${newHp}`,
      details: DM_DETAILS,
    },
  ];

  if (triggered.messages.length > 0) {
    events.push(systemEvent(ctx.scene.round, `Тригери після зміни HP: ${triggered.messages.join("; ")}`));
  }

  return { participants: triggered.updatedParticipants, pending: ctx.pending, events };
}
