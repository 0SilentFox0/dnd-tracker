import { describe, expect, it } from 'vitest';

import { pinFirstHero } from '@/lib/hooks/battle/modes/maze/useMazeView';

describe('pinFirstHero', () => {
    it('takes the first hero when nothing is pinned', () => {
        expect(pinFirstHero(null, ['a', 'b'])).toBe('a');
    });

    it('keeps the pin when the initiative order changes', () => {
        expect(pinFirstHero('a', ['b', 'a'])).toBe('a');
    });

    it('re-pins when the pinned hero left the field, null with no heroes', () => {
        expect(pinFirstHero('a', ['b', 'c'])).toBe('b');
        expect(pinFirstHero('a', [])).toBeNull();
    });
});
