import type { BattleParticipant } from '@/types/battle';

export const isLethal = (
    target: BattleParticipant,
    threshold: number | undefined
): boolean =>
    threshold !== undefined && target.combatStats.currentHp <= threshold;

/** Overflow past 0 HP equals max HP, so a hero dies outright instead of starting death saves */
export const lethalAmount = (target: BattleParticipant): number =>
    target.combatStats.currentHp +
    target.combatStats.tempHp +
    target.combatStats.maxHp;
