import { describe, expect, it, vi } from 'vitest';

import { D6POOL_SYSTEM } from '@/lib/__tests__/fixtures/d6pool/definition';
import { context } from '@/lib/server/battles/__tests__/mutations/fixtures';
import { placed } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { prepareLongCast } from '@/lib/utils/battle/spell/long-cast';
import type { CastableSpell } from '@/lib/utils/battle/types/spell-process';

vi.mock('@/lib/utils/rules/systems', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    ruleSystemOf: () => D6POOL_SYSTEM,
    ruleSystemByKey: () => D6POOL_SYSTEM,
}));

const spell = {
    id: 's1',
    name: 'Ritual',
    definition: { casting: { rounds: 2 } },
} as unknown as CastableSpell;

const ctxAt = (round: number, caster = placed('c', { hp: 20 })) => {
    const base = context({ participants: [caster], isDM: true });

    return { ...base, scene: { ...base.scene, round } };
};

describe('long cast on a system without concentration', () => {
    it('begins in round 1 and finishes in round 2', () => {
        const first = prepareLongCast(
            ctxAt(1),
            placed('c', { hp: 20 }),
            spell,
            {}
        );

        expect(first.ready).toBe(false);
        expect(first.caster.battleData.pendingCast?.remainingRounds).toBe(1);

        const second = prepareLongCast(
            ctxAt(2, first.caster),
            first.caster,
            spell,
            {}
        );

        expect(second.ready).toBe(true);
        expect(second.caster.battleData.pendingCast).toBeUndefined();
    });

    it('a gap of more than one round still interrupts it', () => {
        const first = prepareLongCast(
            ctxAt(1),
            placed('c', { hp: 20 }),
            spell,
            {}
        );

        expect(() =>
            prepareLongCast(ctxAt(3, first.caster), first.caster, spell, {})
        ).toThrow();
    });
});
