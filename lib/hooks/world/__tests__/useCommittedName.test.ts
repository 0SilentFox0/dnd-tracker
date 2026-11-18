// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCommittedName } from '../useCommittedName';

describe('useCommittedName', () => {
    it('saves a changed trimmed name', () => {
        const save = vi.fn();

        const { result } = renderHook(() => useCommittedName('Old', save));

        act(() => result.current.setName('  New '));
        act(() => result.current.commitName());
        expect(save).toHaveBeenCalledWith('New');
    });

    it('restores the current name when emptied and skips unchanged', () => {
        const save = vi.fn();

        const { result } = renderHook(() => useCommittedName('Old', save));

        act(() => result.current.setName('  '));
        act(() => result.current.commitName());
        expect(result.current.name).toBe('Old');
        act(() => result.current.commitName());
        expect(save).not.toHaveBeenCalled();
    });
});
