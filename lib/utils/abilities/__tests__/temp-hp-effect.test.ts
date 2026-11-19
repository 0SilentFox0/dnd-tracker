import { describe, expect, it } from 'vitest';

import { makeParticipant, resolved, seq } from './fixtures';

import { applyRawDamage } from '@/lib/utils/abilities/engine/effects/hp';
import { applyEffect } from '@/lib/utils/abilities/registry/effects';
import type { Effect } from '@/lib/utils/abilities/schema';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleParticipant } from '@/types/battle';

const grant = (amount: number, existing: number): BattleParticipant => {
    const effect: Effect = { kind: 'tempHp', amount, target: 'eventTarget' };

    const t = makeParticipant({ id: 't', hp: 10, maxHp: 20 });

    const out = applyEffect({
        participants: [
            makeParticipant({ id: 'o' }),
            { ...t, combatStats: { ...t.combatStats, tempHp: existing } },
        ],
        ability: resolved({ trigger: { event: 'action' }, effects: [effect] }),
        effectIndex: 0,
        ownerId: 'o',
        effect,
        targetIds: ['t'],
        event: { type: 'action', actorId: 'o', abilityKey: 'k' },
        ctx: { round: 1, rng: seq(0.5), rules: DEFAULT_RULES },
    });

    return out.participants.find(
        (p) => p.basicInfo.id === 't'
    ) as BattleParticipant;
};

describe('tempHp effect', () => {
    it('sets temp HP on a target without any', () => {
        expect(grant(8, 0).combatStats.tempHp).toBe(8);
    });

    it('takes the higher value and never sums', () => {
        expect(grant(8, 5).combatStats.tempHp).toBe(8);
        expect(grant(5, 8).combatStats.tempHp).toBe(8);
    });

    it('temp HP absorbs damage before current HP', () => {
        const hit = applyRawDamage(grant(8, 0), 5);

        expect(hit.combatStats.tempHp).toBe(3);
        expect(hit.combatStats.currentHp).toBe(10);
    });
});
