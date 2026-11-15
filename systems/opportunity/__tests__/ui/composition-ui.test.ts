import { describe, expect, it } from 'vitest';

import { systemUiOf } from '@/components/systems/registry';

describe('opportunity ui contribution', () => {
    it('dnd5e gets the rules item, bare d20 does not', () => {
        expect(
            systemUiOf('dnd5e').rulesItems?.['actions.opportunityAttacks']
        ).toBeDefined();
        expect(
            systemUiOf('d20').rulesItems?.['actions.opportunityAttacks']
        ).toBeUndefined();
    });
});
