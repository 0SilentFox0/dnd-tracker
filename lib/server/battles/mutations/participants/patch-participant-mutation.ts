import { API_ERRORS } from "@/lib/constants/api-errors";
import { CombatStatus } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { resolveDowned } from "@/lib/utils/abilities/engine/core/run-abilities";
import { toggleLair } from "@/lib/utils/battle/actions/lair";
import { settleStatusChange } from "@/lib/utils/battle/damage/consequences";
import { lineText } from "@/lib/utils/battle/log/lines";
import { reserveOf } from "@/lib/utils/battle/participant/reserve";
import { isUp, statusForHp } from "@/lib/utils/battle/participant/state";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, battleActionToEvent, BattleRuleError, dmEvent, systemEvent } from "@/lib/utils/battle/store";
import { advanceAfterRemoval } from "@/lib/utils/battle/turn";
import { rngOf } from "@/lib/utils/common/rng";
import type { PatchParticipantData } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function patchParticipantMutation(
  ctx: BattleMutationContext,
  participantId: string,
  data: PatchParticipantData,
): MutationResult {
  if (data.lairActive !== undefined) {
    if (!ctx.isDM) throw new BattleAccessError(403, API_ERRORS.BATTLE_LAIR_DM_ONLY);

    const actor = findParticipant(ctx.participants, participantId);

    if (!actor) throw new BattleAccessError(404, API_ERRORS.MEMBER_NOT_FOUND);

    const updated = toggleLair(actor, data.lairActive);

    return { participants: ctx.participants.map((p) => p.basicInfo.id === participantId ? updated : p), pending: ctx.pending, events: [dmEvent(ctx.scene.round, textRef(data.lairActive ? "battleLog.dm.lairIn" : "battleLog.dm.lairOut", { name: actor.basicInfo.name }))] };
  }

  if (data.removeFromBattle === true) return removeParticipant(ctx, participantId);

  if (data.kill === true) return updateHp(ctx, participantId, 0, true);

  if (data.revive === true) return revive(ctx, participantId);

  if (data.currentHp !== undefined) return updateHp(ctx, participantId, data.currentHp);

  throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_PATCH_PARTICIPANT_EMPTY);
}

function removeParticipant(ctx: BattleMutationContext, participantId: string): MutationResult {
  const removedIndex = ctx.participants.findIndex((p) => p.basicInfo.id === participantId);

  if (removedIndex === -1) return removeFromReserve(ctx, participantId);

  const removed = ctx.participants[removedIndex];

  const participants = ctx.participants.filter((p) => p.basicInfo.id !== participantId);

  const removalEvent = dmEvent(ctx.scene.round, textRef("battleLog.dm.removed", { name: removed.basicInfo.name }));

  const current = ctx.scene.turnIndex;

  // хід був на видаленому — наступний отримує повний початок ходу (а з кінця черги — новий раунд)
  if (removedIndex === current && participants.length > 0) {
    const advanced = advanceAfterRemoval({ participants, pending: ctx.pending, scene: ctx.scene, map: ctx.meta.map, before: removedIndex });

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

function removeFromReserve(ctx: BattleMutationContext, participantId: string): MutationResult {
  const removed = findParticipant(reserveOf(ctx.pending), participantId);

  if (!removed) throw new BattleAccessError(404, API_ERRORS.MEMBER_NOT_FOUND);

  return {
    participants: ctx.participants,
    pending: ctx.pending.filter((p) => p !== removed),
    events: [dmEvent(ctx.scene.round, textRef("battleLog.dm.removedReserve", { name: removed.basicInfo.name }))],
  };
}

function updateHp(ctx: BattleMutationContext, participantId: string, requestedHp: number, kill = false): MutationResult {
  const idx = ctx.participants.findIndex((p) => p.basicInfo.id === participantId);

  if (idx === -1) throw new BattleAccessError(404, API_ERRORS.MEMBER_NOT_FOUND);

  const participant = ctx.participants[idx];

  const oldHp = participant.combatStats.currentHp;

  const newHp = Math.min(requestedHp, participant.combatStats.maxHp);

  const updated: BattleParticipant = {
    ...participant,
    combatStats: {
      ...participant.combatStats,
      currentHp: newHp,
      status: statusForHp(participant, newHp, kill),
    },
  };

  const settled = settleStatusChange(participant, updated, ctx.participants.map((p, i) => (i === idx ? updated : p)), ctx.meta.rules);

  const order = settled.participants;

  const downed = oldHp > 0 && newHp <= 0
    ? resolveDowned(order, { victimId: participantId, actorId: null }, { round: ctx.scene.round, rng: rngOf(ctx), rules: ctx.meta.rules }, { allowSurvive: false })
    : { participants: order, messages: [] as LogLine[] };

  const name = updated.basicInfo.name;

  const events: MutationResult["events"] = [
    dmEvent(
      ctx.scene.round,
      kill ? textRef("battleLog.dm.killed", { name }) : textRef("battleLog.dm.hpChanged", { name, old: oldHp, new: newHp }),
      [{ participantId, participantName: name }],
      [{ participantId, participantName: name, oldHp, newHp, change: oldHp - newHp }],
    ),
  ];

  const messages = [...settled.messages, ...downed.messages];

  if (messages.length > 0) {
    events.push(systemEvent(ctx.scene.round, lineText(messages, " | ")));
  }

  return { participants: downed.participants, pending: ctx.pending, events };
}

function revive(ctx: BattleMutationContext, participantId: string): MutationResult {
  const idx = ctx.participants.findIndex((p) => p.basicInfo.id === participantId);

  if (idx === -1) throw new BattleAccessError(404, API_ERRORS.MEMBER_NOT_FOUND);

  const participant = ctx.participants[idx];

  if (isUp(participant)) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_PARTICIPANT_ALREADY_ALIVE);

  const oldHp = participant.combatStats.currentHp;

  const newHp = Math.min(1, participant.combatStats.maxHp);

  const revived: BattleParticipant = { ...participant, combatStats: { ...participant.combatStats, currentHp: newHp, status: CombatStatus.ACTIVE } };

  const participants = settleStatusChange(participant, revived, ctx.participants.map((p, i) => (i === idx ? revived : p)), ctx.meta.rules).participants;

  const name = participant.basicInfo.name;

  return {
    participants,
    pending: ctx.pending,
    events: [
      dmEvent(
        ctx.scene.round,
        textRef("battleLog.dm.revived", { name, hp: newHp }),
        [{ participantId, participantName: name }],
        [{ participantId, participantName: name, oldHp, newHp, change: oldHp - newHp }],
      ),
    ],
  };
}
