// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useBattleSetupView } from '../useBattleSetupView';

describe('useBattleSetupView', () => {
    it('starts on heroes with the roster closed and updates both', () => {
        const { result } = renderHook(() => useBattleSetupView());

        expect(result.current.catalog.tab).toBe('heroes');
        expect(result.current.roster.open).toBe(false);

        act(() => result.current.catalog.set('units'));
        act(() => result.current.roster.set(true));

        expect(result.current.catalog.tab).toBe('units');
        expect(result.current.roster.open).toBe(true);
    });
});
