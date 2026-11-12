import { describe, expect, it } from 'vitest';

import type { Ability } from '@/lib/utils/abilities/schema';
import { damageAffinity } from '@/systems/skilltrees/rules/damage-affinity';

const passive = (effects: Ability['effects']): Ability => ({
    id: 'a',
    name: 'A',
    trigger: { event: 'passive' },
    effects,
});

describe('damageAffinity', () => {
    it('пасивний бонус шкоди одного виду', () => {
        expect(
            damageAffinity([
                passive([
                    {
                        kind: 'damageBonus',
                        filter: { kind: 'melee' },
                        percent: 10,
                    },
                ]),
            ])
        ).toEqual({ affectsDamage: true, damageType: 'melee' });
    });

    it('різні види → без типу; без бонусу → не впливає', () => {
        expect(
            damageAffinity([
                passive([
                    { kind: 'damageBonus', filter: { kind: 'melee' }, flat: 1 },
                    { kind: 'damageBonus', filter: { kind: 'magic' }, flat: 1 },
                ]),
            ])
        ).toEqual({ affectsDamage: true, damageType: null });
        expect(
            damageAffinity([passive([{ kind: 'note', text: 'x' }])])
        ).toEqual({ affectsDamage: false, damageType: null });
    });
});
