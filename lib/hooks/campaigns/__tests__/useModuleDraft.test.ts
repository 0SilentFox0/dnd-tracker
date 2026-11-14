// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useModuleDraft } from '../useModuleDraft';

import '@/components/systems/registry';

describe('useModuleDraft', () => {
    it('starts from the saved composition and edits only the draft', () => {
        const { result } = renderHook(() =>
            useModuleDraft({ key: 'dnd5e', modules: [] })
        );

        expect(result.current.isChanged).toBe(false);

        act(() => result.current.set('morale', true));

        expect(result.current.draft).toEqual({
            key: 'dnd5e',
            modules: ['morale'],
        });
        expect(result.current.preview.added).toEqual(['morale']);
        expect(result.current.isChanged).toBe(true);

        act(() => result.current.set('morale', false));

        expect(result.current.isChanged).toBe(false);
    });
});
