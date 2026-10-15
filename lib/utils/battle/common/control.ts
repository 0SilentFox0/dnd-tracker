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
