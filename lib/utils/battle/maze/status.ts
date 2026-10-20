import { ParticipantSide } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleParticipant } from "@/types/battle";

export const isDormant = (p: BattleParticipant): boolean => !!p.battleData.dormant;

export const isEscaped = (p: BattleParticipant): boolean => !!p.battleData.escaped;

export const inMazePlay = (p: BattleParticipant): boolean => isActive(p) && !isDormant(p) && !isEscaped(p);

/** Лише прапорці лабіринту: у звичайному бою завжди false. */
export function mazeSkipsTurn(p: BattleParticipant, round: number): boolean {
  return isDormant(p) || isEscaped(p) || (p.battleData.mazeWakeRound ?? 0) > round;
}

export const takesTurn = (p: BattleParticipant, round: number): boolean => isActive(p) && !mazeSkipsTurn(p, round);

export const isMazeHero = (p: BattleParticipant): boolean => p.basicInfo.side === ParticipantSide.ALLY && inMazePlay(p) && p.battleData.position !== undefined;
