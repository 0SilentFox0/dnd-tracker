import { describe, expect, it } from 'vitest';

import { moraleOutcome } from '@/systems/morale/rules/turn/outcome';

describe('moraleOutcome', () => {
    it('extra / skip / none', () => {
        expect(
            moraleOutcome({ hasExtraTurn: true, shouldSkipTurn: false })
        ).toBe('extra');
        expect(
            moraleOutcome({ hasExtraTurn: false, shouldSkipTurn: true })
        ).toBe('skip');
        expect(
            moraleOutcome({ hasExtraTurn: false, shouldSkipTurn: false })
        ).toBe('none');
        expect(moraleOutcome(null)).toBe('none');
    });
});
