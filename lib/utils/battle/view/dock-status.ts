import type { BattleParticipant } from '@/types/battle';

export const reactionAvailable = (p: BattleParticipant) =>
    !p.actionFlags.hasUsedReaction;

export const movementOf = (p: BattleParticipant) => {
    const speed = p.combatStats.speed;

    if (!speed) return undefined;

    return {
        used: p.battleData.movementUsed ?? 0,
        max: speed + (p.battleData.extraMovement ?? 0),
    };
};

export const showDock = (hero: BattleParticipant | null, readOnly: boolean) =>
    !!hero && !readOnly;
