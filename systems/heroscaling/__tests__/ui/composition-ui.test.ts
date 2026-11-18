import { describe, expect, it } from 'vitest';

import { systemUiOf } from '@/components/systems/registry';

describe('heroscaling ui contribution', () => {
    it('d20 + heroscaling and homm get the rules section, bare d20 does not', () => {
        expect(
            systemUiOf('d20', ['heroscaling']).rulesSections?.heroScaling
        ).toBeDefined();
        expect(systemUiOf('homm').rulesSections?.heroScaling).toBeDefined();
        expect(
            systemUiOf('d20', []).rulesSections?.heroScaling
        ).toBeUndefined();
    });
});
