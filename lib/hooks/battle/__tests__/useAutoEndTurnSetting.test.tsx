// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAutoEndTurnSetting } from '../useAutoEndTurnSetting';

describe('useAutoEndTurnSetting', () => {
    beforeEach(() => localStorage.clear());

    it('is on by default and stores changes', () => {
        const { result } = renderHook(() => useAutoEndTurnSetting());

        expect(result.current.autoEnd).toBe(true);

        act(() => result.current.setAutoEnd(false));
        expect(result.current.autoEnd).toBe(false);
        expect(localStorage.getItem('battle-auto-end-turn')).toBe('off');
    });
});
