import { beforeAll, describe, expect, it } from 'vitest';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { parseRules } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';

let ruleSystemOf: typeof import('@/lib/utils/rules/systems').ruleSystemOf;

beforeAll(async () => {
    ({ ruleSystemOf } = await import('@/lib/utils/rules/systems'));
}, 30_000);

const withModel = (damageModel?: '5e'): BattleParticipant => {
    const base = createMockParticipant();

    return {
        ...base,
        abilities: {
            ...base.abilities,
            ...(damageModel && { damageModel }),
            modifiers: { ...base.abilities.modifiers, intelligence: 3 },
        },
        spellcasting: {
            ...base.spellcasting,
            spellcastingAbility: 'intelligence' as const,
        },
    };
};

describe('d20 offHand and spellAbilityMod', () => {
    const dnd5e = parseRules({ system: { key: 'dnd5e' } });

    it.each([
        ['dnd5e', dnd5e],
        ['homm', DEFAULT_RULES],
    ])(
        '%s: a 5e participant may attack off-hand, a hero may not',
        (_n, rules) => {
            const { combat } = ruleSystemOf(rules);

            expect(combat.offHand?.allowed(withModel('5e'))).toBe(true);
            expect(combat.offHand?.allowed(withModel())).toBe(false);
        }
    );

    it('the spell ability modifier exists for a 5e caster only', () => {
        const { magic } = ruleSystemOf(dnd5e);

        expect(magic.spellAbilityMod?.(withModel('5e'))).toEqual({
            mod: 3,
            label: 'INT',
        });
        expect(magic.spellAbilityMod?.(withModel())).toBeNull();
    });
});
