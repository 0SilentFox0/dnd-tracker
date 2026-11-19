import { describe, expect, it } from 'vitest';

import { assertMayCast } from '../spell-block';

import {
    makeEffect,
    makeParticipant,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import type { BattleParticipant } from '@/types/battle';

const raging = (): BattleParticipant => {
    const p = makeParticipant({ id: 'b' });

    return {
        ...p,
        battleData: {
            ...p.battleData,
            activeEffects: [
                makeEffect('rage', {
                    abilityEffects: [
                        { kind: 'flag', flag: 'noSpellcasting' },
                    ] as StaticEffect[],
                }),
            ],
        },
    };
};

describe('assertMayCast', () => {
    it('lets a normal caster cast', () => {
        const p = makeParticipant({ id: 'c' });

        expect(() => assertMayCast(p, [p])).not.toThrow();
    });

    it('rejects a caster under the noSpellcasting flag', () => {
        const p = raging();

        expect(() => assertMayCast(p, [p])).toThrow(
            expect.objectContaining({ code: 'action_rejected' })
        );
    });
});

describe('damageBonus ability filter (Rage is Strength-only)', () => {
    const bonus = (ability?: 'strength' | 'dexterity') => {
        const p = makeParticipant({ id: 'b' });

        const self: BattleParticipant = {
            ...p,
            battleData: {
                ...p.battleData,
                activeEffects: [
                    makeEffect('rage', {
                        abilityEffects: [
                            {
                                kind: 'damageBonus',
                                filter: { kind: 'melee', ability: 'strength' },
                                flat: 2,
                            },
                        ] as StaticEffect[],
                    }),
                ],
            },
        };

        return collectModifiers([self], 'b', {
            damage: { kind: 'melee', ability },
        }).flat;
    };

    it('applies to a Strength attack, not to a Dexterity one', () => {
        expect(bonus('strength')).toBe(2);
        expect(bonus('dexterity')).toBe(0);
    });

    it('applies when the attack ability is unknown', () => {
        expect(bonus()).toBe(2);
    });
});
