import { describe, expect, it } from 'vitest';

import { context, hero } from './fixtures';

import { CombatStatus } from '@/lib/constants/battle';
import { patchParticipantMutation } from '@/lib/server/battles/mutations/participants/patch-participant-mutation';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';

describe('patch-participant revive under wfrp', () => {
    it('clears outOfFight and the death timer', () => {
        const fallen = withWfrpState(
            {
                ...hero,
                combatStats: {
                    ...hero.combatStats,
                    currentHp: 0,
                    status: CombatStatus.UNCONSCIOUS,
                },
            },
            { outOfFight: true, dyingRounds: 2 }
        );

        const base = context();

        const out = patchParticipantMutation(
            context({
                participants: [fallen],
                meta: { ...base.meta, rules: WFRP_RULES },
            }),
            'hero',
            { revive: true }
        );

        const revived = out.participants.find(
            (p) => p.basicInfo.id === 'hero'
        )!;

        expect(revived.combatStats.status).toBe(CombatStatus.ACTIVE);
        expect(wfrpState(revived).outOfFight).toBeUndefined();
        expect(wfrpState(revived).dyingRounds).toBeUndefined();
    });
});
