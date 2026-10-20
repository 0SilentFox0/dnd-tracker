import { ParticipantSide } from "@/lib/constants/battle";
import { inMazePlay, isActive, isDormant, isEscaped } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleParticipant } from "@/types/battle";

export { inMazePlay, isDormant, isEscaped };

/** Лише прапорці лабіринту: у звичайному бою завжди false. */
export function mazeSkipsTurn(p: BattleParticipant, round: number): boolean {
  return isDormant(p) || isEscaped(p) || (p.battleData.mazeWakeRound ?? 0) > round;
}

export const takesTurn = (p: BattleParticipant, round: number): boolean => isActive(p) && !mazeSkipsTurn(p, round);

const isHeroSide = (p: BattleParticipant): boolean => p.basicInfo.side === ParticipantSide.ALLY;

/** Стоїть на полі лабіринту: має клітинку, живий, не в резерві й не вибрався. */
export const onMazeField = (p: BattleParticipant): boolean => p.battleData.position !== undefined && !p.battleData.reserved && !isEscaped(p) && isActive(p);

/** Герої, що ще в лабіринті (зокрема без клітинки — їх розставить карта). */
export const mazeHeroes = (ps: BattleParticipant[]): BattleParticipant[] => ps.filter((p) => isHeroSide(p) && !p.battleData.reserved && !isEscaped(p) && isActive(p));

export const isMazeHero = (p: BattleParticipant): boolean => isHeroSide(p) && inMazePlay(p) && p.battleData.position !== undefined;

/** Хто стоїть на ходу, коли ніхто не ходить: перший у грі лабіринту, інакше перший живий, інакше 0. */
export function idleTurnIndex(order: BattleParticipant[]): number {
  const inPlay = order.findIndex(inMazePlay);

  return inPlay >= 0 ? inPlay : Math.max(0, order.findIndex(isActive));
}
