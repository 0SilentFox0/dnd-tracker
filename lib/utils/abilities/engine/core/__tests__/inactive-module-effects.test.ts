import { describe, expect, it, vi } from 'vitest';

vi.mock(
    '@/lib/utils/abilities/registry/effects/system-rows',
    async (importOriginal) => {
        const original =
            await importOriginal<
                typeof import('@/lib/utils/abilities/registry/effects/system-rows')
            >();

        return {
            ...original,
            SYSTEM_EFFECT_OWNERSHIP: { kinds: { heal: 'morale' }, flags: {} },
        };
    }
);

import {
    makeParticipant,
    resolved,
    seq,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { runAbilities } from '@/lib/utils/abilities/engine/core/run-abilities';
import { DEFAULT_RULES } from '@/lib/utils/rules';

const owner = () =>
    makeParticipant({
        id: 'a',
        hp: 5,
        maxHp: 20,
        abilities: [
            resolved({
                trigger: { event: 'roundStart' },
                effects: [{ kind: 'heal', amount: 3, target: 'self' }],
            }),
        ],
    });

const run = (modules: string[]) =>
    runAbilities(
        [owner()],
        { type: 'roundStart' },
        {
            rules: {
                ...DEFAULT_RULES,
                system: { ...DEFAULT_RULES.system, modules },
            },
            round: 2,
            rng: seq(0),
        }
    );

describe('runAbilities skips effects of modules outside the composition', () => {
    it('keeps the stored effect but does nothing in a bare composition', () => {
        const r = run([]);

        expect(r.participants[0].combatStats.currentHp).toBe(5);
    });

    it('applies it once its module is active', () => {
        expect(
            run(['morale']).participants[0].combatStats.currentHp
        ).toBeGreaterThan(5);
    });
});
