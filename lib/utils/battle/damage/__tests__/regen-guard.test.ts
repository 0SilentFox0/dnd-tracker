import { describe, expect, it } from 'vitest';

import {
    clearGuardedDamage,
    markGuardedDamage,
    regenSuppressed,
} from '../regen-guard';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import type { BattleParticipant } from '@/types/battle';

function troll(): BattleParticipant {
    const p = makeParticipant({ id: 't' });

    return {
        ...p,
        battleData: {
            ...p.battleData,
            resolvedAbilities: [
                {
                    key: 'regen',
                    id: 'regeneration',
                    name: 'Regeneration',
                    trigger: { event: 'turnStart' },
                    effects: [
                        {
                            kind: 'heal',
                            amount: 15,
                            target: 'self',
                            unlessDamagedBy: ['acid', 'fire'],
                        },
                    ],
                    source: { type: 'unit', id: 'u', name: 'Troll' },
                } as never,
            ],
        },
    };
}

describe('regen guard', () => {
    it('marks only the guarded damage types', () => {
        const hit = markGuardedDamage(troll(), 'Fire');

        expect(hit.battleData.damagedByTypes).toEqual(['fire']);
        expect(
            markGuardedDamage(troll(), 'slashing').battleData.damagedByTypes
        ).toBeUndefined();
    });

    it('suppresses regeneration after a guarded hit until cleared', () => {
        const hit = markGuardedDamage(troll(), 'acid');

        expect(regenSuppressed(hit, ['acid', 'fire'])).toBe(true);
        expect(regenSuppressed(troll(), ['acid', 'fire'])).toBe(false);
        expect(
            regenSuppressed(clearGuardedDamage(hit), ['acid', 'fire'])
        ).toBe(false);
    });

    it('never marks a creature without a guarded regeneration', () => {
        const plain = makeParticipant({ id: 'p' });

        expect(markGuardedDamage(plain, 'fire')).toBe(plain);
    });
});
