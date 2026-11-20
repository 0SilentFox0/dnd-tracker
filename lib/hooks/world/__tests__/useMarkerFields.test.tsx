// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMarkerFields } from '../useMarkerFields';

import { DEFAULT_ZONE_COLOR } from '@/lib/constants/world';
import type { WorldMarker } from '@/types/world';

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useConfirm: () => vi.fn(),
}));

const setup = (color: string | null) => {
    const mutateOk = vi.fn().mockResolvedValue(true);

    const marker = { id: 'm1', name: 'Town', color } as WorldMarker;

    const hook = renderHook(() =>
        useMarkerFields({
            marker,
            editor: { marker: { update: { mutateOk }, remove: {} } } as never,
            select: vi.fn(),
        })
    );

    return { hook, mutateOk };
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useMarkerFields colour', () => {
    it('keeps a null colour and shows the default in the swatch', () => {
        const { hook } = setup(null);

        expect(hook.result.current.color).toBeNull();
        expect(hook.result.current.colorValue).toBe(DEFAULT_ZONE_COLOR);
    });

    it('resetColor saves color: null', () => {
        const { hook, mutateOk } = setup('#112233');

        act(() => hook.result.current.resetColor());
        act(() => void vi.advanceTimersByTime(500));

        expect(hook.result.current.color).toBeNull();
        expect(mutateOk).toHaveBeenCalledWith({
            id: 'm1',
            data: { color: null },
        });
    });
});
