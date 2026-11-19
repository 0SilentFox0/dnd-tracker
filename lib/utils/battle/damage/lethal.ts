import type { BattleParticipant } from '@/types/battle';

export const isLethal = (
    target: BattleParticipant,
    threshold: number | undefined
): boolean =>
    threshold !== undefined && target.combatStats.currentHp <= threshold;

export const lethalAmount = (target: BattleParticipant): number =>
    target.combatStats.currentHp + target.combatStats.tempHp;
