import { findParticipant, isActive } from "@/lib/utils/abilities/engine/core/participants";
import { BattleAccessError, type BattleRuleCode, BattleRuleError } from "@/lib/utils/battle/store/errors";
import type { BattleParticipant } from "@/types/battle";

export interface BattleActor {
  userId: string;
  isDM: boolean;
}

/** DM керує всіма; гравець — лише учасниками, якими керує (герой, юніти сторони, прикликані). */
export function controls(actor: BattleActor, p: BattleParticipant | undefined): boolean {
  return actor.isDM || (!!p && p.basicInfo.controlledBy === actor.userId);
}

/** Діяти (атака, закляття, вміння, мораль) гравець може лише своїм учасником і лише в його хід. */
export function canActNow(actor: BattleActor, p: BattleParticipant | undefined, current: BattleParticipant | undefined): boolean {
  return actor.isDM || (controls(actor, p) && !!p && current?.basicInfo.id === p.basicInfo.id);
}

export interface ActorScope extends BattleActor {
  participants: BattleParticipant[];
  scene: { turnIndex: number };
}

export const currentOf = (scope: Pick<ActorScope, "participants" | "scene">): BattleParticipant | undefined => scope.participants[scope.scene.turnIndex];

export interface ActorGuardTexts {
  missing: string;
  forbidden: string;
  inactive?: { code: BattleRuleCode; message: string };
  anyTurn?: boolean;
}

export function requireActor(ctx: ActorScope, id: string, texts: ActorGuardTexts): BattleParticipant {
  const actor = findParticipant(ctx.participants, id);

  if (!actor) throw new BattleAccessError(404, texts.missing);

  if (!(texts.anyTurn ? controls(ctx, actor) : canActNow(ctx, actor, currentOf(ctx)))) throw new BattleAccessError(403, texts.forbidden);

  if (texts.inactive && !isActive(actor)) throw new BattleRuleError(texts.inactive.code, texts.inactive.message);

  return actor;
}
