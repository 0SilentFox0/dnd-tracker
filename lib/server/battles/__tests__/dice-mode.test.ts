import { describe, expect, it } from 'vitest';

import { assertDiceMode } from '../dice';

describe('assertDiceMode', () => {
    it.each(['castRoll', 'fortuneRoll'])(
        'rejects %s outside manual dice mode',
        (key) => {
            expect(() => assertDiceMode({ [key]: 50 }, 'server')).toThrow();
            expect(() => assertDiceMode({ [key]: 50 }, 'manual')).not.toThrow();
        }
    );
});
