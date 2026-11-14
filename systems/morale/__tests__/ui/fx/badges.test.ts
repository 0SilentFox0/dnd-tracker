import { describe, expect, it } from 'vitest';

import '@/components/systems/registry';
import { systemUiOf } from '@/components/systems';

describe('morale fx badges', () => {
    it('d20 + morale composition carries the raincloud badge and the dice source', () => {
        const fx = systemUiOf('dnd5e', ['morale']).fx;

        expect(fx?.badges?.raincloud?.message).toBe('battleMorale.fxBadge');
        expect(fx?.dice).toHaveLength(1);
    });
});
