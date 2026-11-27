// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSpellDescriptionDoc } from '../useSpellDescriptionDoc';

describe('useSpellDescriptionDoc', () => {
    it('drops the header and parses markdown marks', () => {
        const head =
            'Level 1 Evocation · Casting Time: Action · Range: 60 feet · Components: V, S · Duration: Instantaneous · Classes: Wizard';

        const { result } = renderHook(() =>
            useSpellDescriptionDoc(`${head}\n\n**_Sensory Effect._** Sparks.`)
        );

        const json = JSON.stringify(result.current);

        expect(json).not.toContain('Casting Time');
        expect(json).not.toContain('**');
        expect(json).toContain('bold');
        expect(json).toContain('Sensory Effect.');
    });
});
