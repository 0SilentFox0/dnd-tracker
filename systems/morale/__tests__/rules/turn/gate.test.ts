import { describe, expect, it } from 'vitest';

import { isPanicking } from '@/systems/morale/rules/turn/gate';

const pending = (participantId: string, shouldSkipTurn: boolean) => ({
    participantId,
    d10Roll: 1,
    moraleResult: {
        shouldSkipTurn,
        hasExtraTurn: false,
        moralePositive: !shouldSkipTurn,
        message: '',
    },
});

describe('isPanicking', () => {
    it('паніка цього учасника — так; інший учасник, без пропуску або без перевірки — ні', () => {
        expect(isPanicking(pending('hero', true), 'hero')).toBe(true);
        expect(isPanicking(pending('gob', true), 'hero')).toBe(false);
        expect(isPanicking(pending('hero', false), 'hero')).toBe(false);
        expect(isPanicking(null, 'hero')).toBe(false);
    });
});
