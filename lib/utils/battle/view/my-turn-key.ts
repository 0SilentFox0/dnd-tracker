import type { BattleParticipant } from '@/types/battle';

export const myTurnKey = (hero: BattleParticipant, round: number) =>
    `${hero.basicInfo.id}-${round}-${hero.battleData.extraTurnActive ? 'x' : 'n'}`;
