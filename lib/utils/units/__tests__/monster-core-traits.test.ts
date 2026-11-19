import { describe, expect, it } from 'vitest';

import { battleSpeed, coreTrait } from '../monster-core-traits';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { baseMovement } from '@/lib/utils/battle/grid/path';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

describe('battleSpeed', () => {
    it('takes the fastest of walk/fly, else swim, climb, burrow', () => {
        expect(battleSpeed({ walk: 0, fly: 40 })).toBe(40);
        expect(battleSpeed({ walk: 30, fly: 20 })).toBe(30);
        expect(battleSpeed({ walk: 0, swim: 30 })).toBe(30);
        expect(battleSpeed({ climb: 20, burrow: 10 })).toBe(20);
        expect(battleSpeed({})).toBe(0);
    });

    it('a fly-only unit has movement cells in battle', () => {
        const p = makeParticipant({ id: 'f' });

        expect(
            baseMovement(
                {
                    ...p,
                    combatStats: {
                        ...p.combatStats,
                        speed: battleSpeed({ walk: 0, fly: 30 }),
                    },
                },
                DEFAULT_RULES
            )
        ).toBe(6);
    });
});

describe('coreTrait', () => {
    it('ignores unrelated traits and regeneration without a number', () => {
        expect(coreTrait('Pack Tactics', 'x')).toBeUndefined();
        expect(coreTrait('Regeneration', 'heals a lot')).toBeUndefined();
    });
});

describe('coreTrait regeneration guard', () => {
    const troll =
        "The troll regains 15 Hit Points at the start of each of its turns. If the troll takes Acid or Fire damage, this trait doesn't function on the troll's next turn. The troll dies only if it starts its turn with 0 Hit Points and doesn't regenerate.";

    it('reads the damage types that switch regeneration off', () => {
        expect(coreTrait('Regeneration', troll)?.effects[0]).toEqual({
            kind: 'heal',
            amount: 15,
            target: 'self',
            unlessDamagedBy: ['acid', 'fire'],
        });
    });

    it('leaves plain regeneration unguarded', () => {
        const core = coreTrait(
            'Regeneration',
            'The oni regains 10 Hit Points at the start of each of its turns if it has at least 1 Hit Point.'
        );

        expect(core?.effects[0]).not.toHaveProperty('unlessDamagedBy');
    });
});
