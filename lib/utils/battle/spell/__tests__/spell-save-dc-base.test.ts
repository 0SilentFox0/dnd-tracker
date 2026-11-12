import { describe, expect, it } from 'vitest';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { spellSaveDc } from '@/lib/utils/battle/spell/save-dc';
import { DEFAULT_RULES } from '@/lib/utils/rules';

describe('spellSaveDc з базою кампанії', () => {
    const p = createMockParticipant();

    it('dcAbility використовує передану базу', () => {
        const prof = p.abilities.proficiencyBonus;

        const mod = p.abilities.modifiers.wisdom;

        expect(spellSaveDc(DEFAULT_RULES, p, 'wisdom')).toBe(8 + prof + mod);
        expect(
            spellSaveDc(
                {
                    ...DEFAULT_RULES,
                    formulas: { ...DEFAULT_RULES.formulas, saveDcBase: 10 },
                },
                p,
                'wisdom'
            )
        ).toBe(10 + prof + mod);
    });
});
