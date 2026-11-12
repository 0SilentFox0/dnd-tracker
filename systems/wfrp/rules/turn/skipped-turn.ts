import { wfrpSkippedTurn } from "../conditions/tick";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import type { TurnHook, TurnSubjectCtx } from "@/lib/utils/rules/systems/types";

export const wfrpOnSkippedTurn: TurnHook<TurnSubjectCtx> = (ctx) => {
  const p = findParticipant(ctx.participants, ctx.id);

  if (!p || p.combatStats.status !== CombatStatus.UNCONSCIOUS) return { participants: ctx.participants, messages: [] };

  const bleed = wfrpSkippedTurn(ctx.participants, ctx.id, ctx);

  // збитий ворог без кровотечі щоразу не засмічує журнал
  const quiet = p.basicInfo.side === ParticipantSide.ENEMY && bleed.messages.length === 0;

  const skip = quiet ? [] : [textRef("battleLog.turn.skipUnconscious", { name: p.basicInfo.name })];

  return { participants: bleed.participants, messages: [...skip, ...bleed.messages], skipTurn: true };
};
