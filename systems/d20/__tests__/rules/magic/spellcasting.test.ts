import { describe, expect, it } from 'vitest';

import { DEFAULT_RULES } from '@/lib/utils/rules';
import { parseRules } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { spellcastingDerived } from '@/systems/d20/rules/magic/spellcasting';
import { proficiencyForLevel } from '@/systems/d20/rules/proficiency/level';

const scores = {
    strength: 10,
    dexterity: 18,
    constitution: 10,
    intelligence: 16,
    wisdom: 10,
    charisma: 10,
};

const custom = parseRules({
    formulas: { saveDcBase: 10, proficiencyBase: 1, proficiencyEvery: 2 },
});

describe('spellcastingDerived', () => {
    it('DEFAULT_RULES: майстерність 3, СК 14 на 5-му рівні при INT 16', () => {
        expect(proficiencyForLevel(5, DEFAULT_RULES.formulas)).toBe(3);
        expect(spellcastingDerived(5, 'intelligence', scores)).toEqual({
            saveDC: 14,
            attackBonus: 6,
        });
    });

    it('власні формули: майстерність 3, СК 16', () => {
        expect(proficiencyForLevel(5, custom.formulas)).toBe(3);
        expect(
            spellcastingDerived(5, 'intelligence', scores, custom.formulas)
        ).toEqual({ saveDC: 16, attackBonus: 6 });
    });

    it('СЛ і атака заклинанням від рівня', () => {
        expect(spellcastingDerived(30, 'intelligence', scores)).toEqual({
            saveDC: 8 + 9 + 3,
            attackBonus: 9 + 3,
        });
        expect(spellcastingDerived(30, null, scores)).toBeNull();
    });
});

describe('composed hooks', () => {
    it('d20 derives proficiency and spellcasting from the rules', () => {
        const system = ruleSystemOf(custom);

        expect(system.progression.proficiency?.(5, custom)).toBe(3);
        expect(
            system.magic.spellcasting?.({
                level: 5,
                ability: 'intelligence',
                scores,
                rules: custom,
            })
        ).toEqual({ saveDC: 16, attackBonus: 6 });
    });

    it('wfrp has neither hook', () => {
        const rules = parseRules({ system: { key: 'wfrp' } });

        expect(ruleSystemOf(rules).progression.proficiency).toBeUndefined();
        expect(ruleSystemOf(rules).magic.spellcasting).toBeUndefined();
    });
});
