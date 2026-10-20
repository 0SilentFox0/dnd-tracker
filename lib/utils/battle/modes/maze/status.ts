import { ParticipantSide } from "@/lib/constants/battle";
import { inPlay, isActive, isEscaped } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleParticipant, GridPoint } from "@/types/battle";

const isHeroSide = (p: BattleParticipant): boolean => p.basicInfo.side === ParticipantSide.ALLY;

export type PlacedParticipant = BattleParticipant & { battleData: { position: GridPoint } };

export const isPlaced = (p: BattleParticipant): p is PlacedParticipant => p.battleData.position !== undefined;

/** Стоїть на полі лабіринту: має клітинку, живий, не в резерві й не вибрався. */
export const onMazeField = (p: BattleParticipant): p is PlacedParticipant => isPlaced(p) && !p.battleData.reserved && !isEscaped(p) && isActive(p);

/** Герої, що ще в лабіринті (зокрема без клітинки — їх розставить карта). */
export const mazeHeroes = (ps: BattleParticipant[]): BattleParticipant[] => ps.filter((p) => isHeroSide(p) && !p.battleData.reserved && !isEscaped(p) && isActive(p));

export const isMazeHero = (p: BattleParticipant): p is PlacedParticipant => isHeroSide(p) && inPlay(p) && isPlaced(p);
