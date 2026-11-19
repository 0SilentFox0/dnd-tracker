import { describe, expect, it } from 'vitest';

import { makeEffect } from '@/lib/utils/abilities/__tests__/fixtures';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { d20SpellSaveDc } from '@/systems/d20/rules/magic/save-dc';
import type { BattleParticipant } from '@/types/battle';

const exhausted = (
    level: number,
    variant: '2014' | '2024'
): BattleParticipant => {
    const p = createMockParticipant();

    return {
        ...p,
        abilities: {
            ...p.abilities,
            proficiencyBonus: 3,
            modifiers: { ...p.abilities.modifiers, intelligence: 3 },
        },
        spellcasting: { ...p.spellcasting, spellcastingAbility: 'intelligence' },
        battleData: {
            ...p.battleData,
            activeEffects: [
                makeEffect('ex', {
                    exhaustionVariant: variant,
                    effects: [{ type: 'exhaustion', value: level }],
                }),
            ],
        },
    };
};

describe('d20SpellSaveDc exhaustion', () => {
    it('2024 exhaustion lowers the DC by 2 per level', () => {
        expect(d20SpellSaveDc(exhausted(2, '2024'), 'intelligence', 8)).toBe(
            14 - 4
        );
    });

    it('2014 exhaustion leaves the DC alone', () => {
        expect(d20SpellSaveDc(exhausted(2, '2014'), 'intelligence', 8)).toBe(14);
    });
});
