import { describe, expect, it } from 'vitest';

import { effectRounds } from '../cast';

describe('effectRounds', () => {
    it('reads nested duration, direct rounds and falls back to 0', () => {
        expect(
            effectRounds({ kind: 'anchoredZone', duration: { rounds: 100 } })
        ).toBe(100);
        expect(effectRounds({ kind: 'createTerrain', rounds: 600 })).toBe(600);
        expect(effectRounds({ kind: 'heal' })).toBe(0);
    });
});
