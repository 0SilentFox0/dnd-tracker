// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useFollowTurnSetting } from '../useFollowTurnSetting';

describe('useFollowTurnSetting', () => {
    beforeEach(() => localStorage.clear());

    it('is off by default and stores changes', () => {
        const { result } = renderHook(() => useFollowTurnSetting());

        expect(result.current.follow).toBe(false);

        act(() => result.current.setFollow(true));
        expect(result.current.follow).toBe(true);
        expect(localStorage.getItem('battle-map-follow-turn')).toBe('on');
    });
});
