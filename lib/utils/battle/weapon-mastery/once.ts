import { upsertLabeled } from '@/lib/utils/battle/actions/effects';
import type { BattleParticipant } from '@/types/battle';

const keyOf = (mastery: string) => `mastery:${mastery}-used`;

/** "Once per turn" is a marker effect that expires at the end of the owner's turn */
export const usedThisTurn = (p: BattleParticipant, mastery: string): boolean =>
    p.battleData.activeEffects.some((e) => e.abilityKey === keyOf(mastery));

export const markUsedThisTurn = (
    p: BattleParticipant,
    mastery: string,
    round: number
): BattleParticipant =>
    upsertLabeled(
        p,
        {
            timedKey: keyOf(mastery),
            name: `${mastery} used`,
            type: 'buff',
            rounds: 1,
            stackable: false,
            until: 'turnEnd',
        },
        round
    );
