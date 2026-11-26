// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { EditorStamps } from '../useMapArtEditor';
import { useStampSelection } from '../useStampSelection';

import type { MapArtStamp } from '@/types/battle-map';

const stamp: MapArtStamp = {
    id: 's1',
    asset: 'altar',
    x: 100,
    y: 100,
    rot: 30,
    scale: 1,
    flip: false,
    z: 0,
};

const makeApi = (selectedId: string | null = 's1') =>
    ({
        selectedId,
        select: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        duplicate: vi.fn(),
        reorder: vi.fn(),
        rotateGhost: vi.fn(),
        flipGhost: vi.fn(),
    }) as unknown as EditorStamps & Record<string, ReturnType<typeof vi.fn>>;

const setup = (api = makeApi()) => ({
    api,
    sel: renderHook(() => useStampSelection({ stamps: [stamp], api, masks: () => null }))
        .result.current,
});

const key = (init: KeyboardEventInit, target?: HTMLElement) => {
    const e = new KeyboardEvent('keydown', { cancelable: true, ...init });

    if (target) Object.defineProperty(e, 'target', { value: target });

    return e;
};

describe('useStampSelection.onKey', () => {
    it('rotates by 15 degrees, backwards with Shift', () => {
        const { api, sel } = setup();

        expect(sel.onKey(key({ key: 'r' }))).toBe(true);
        expect(api.update).toHaveBeenLastCalledWith('s1', { rot: 45 });
        expect(sel.onKey(key({ key: 'R', shiftKey: true }))).toBe(true);
        expect(api.update).toHaveBeenLastCalledWith('s1', { rot: 15 });
    });

    it('flips, deletes, duplicates and reorders', () => {
        const { api, sel } = setup();

        sel.onKey(key({ key: 'f' }));
        expect(api.update).toHaveBeenLastCalledWith('s1', { flip: true });
        sel.onKey(key({ key: 'Delete' }));
        expect(api.remove).toHaveBeenCalledWith('s1');
        sel.onKey(key({ key: 'Backspace' }));
        expect(api.remove).toHaveBeenCalledTimes(2);
        sel.onKey(key({ key: 'd', metaKey: true }));
        expect(api.duplicate).toHaveBeenCalledWith('s1');
        sel.onKey(key({ key: 'd', ctrlKey: true }));
        expect(api.duplicate).toHaveBeenCalledTimes(2);
        sel.onKey(key({ key: '[' }));
        expect(api.reorder).toHaveBeenLastCalledWith('s1', -1);
        sel.onKey(key({ key: ']' }));
        expect(api.reorder).toHaveBeenLastCalledWith('s1', 1);
    });

    it('drives the ghost when nothing is selected', () => {
        const { api, sel } = setup(makeApi(null));

        expect(sel.onKey(key({ key: 'r' }))).toBe(true);
        expect(api.rotateGhost).toHaveBeenCalledWith(1);
        sel.onKey(key({ key: 'f' }));
        expect(api.flipGhost).toHaveBeenCalled();
        expect(sel.onKey(key({ key: 'Delete' }))).toBe(false);
    });

    it('ignores typing in inputs', () => {
        const { api, sel } = setup();

        const input = document.createElement('input');

        expect(sel.onKey(key({ key: 'r' }, input))).toBe(false);
        expect(sel.onKey(key({ key: 'Delete' }, input))).toBe(false);
        expect(api.update).not.toHaveBeenCalled();
        expect(api.remove).not.toHaveBeenCalled();
    });
});

describe('useStampSelection handles', () => {
    it('snaps rotation to multiples of 15 with Shift', () => {
        const { api, sel } = setup();

        sel.onRotateHandle({ x: 100 + 100, y: 100 + 20 }, { shiftKey: true });

        const [id, patch, coalesce] = api.update.mock.calls[0];

        expect(id).toBe('s1');
        expect(patch.rot % 15).toBeCloseTo(0, 6);
        expect(coalesce).toBe('stamp-rot:s1');
    });

    it('scales relative to the first handle distance', () => {
        const { api, sel } = setup();

        sel.onScaleHandle({ x: 200, y: 100 });
        sel.onScaleHandle({ x: 300, y: 100 });

        expect(api.update).toHaveBeenLastCalledWith('s1', { scale: 2 }, 'stamp-scale:s1');
    });

    it('drags with the pointer offset and a move coalesce key', () => {
        const { api, sel } = setup();

        sel.onPointerDown({ x: 110, y: 110 });
        expect(api.select).toHaveBeenCalledWith('s1');
        sel.onPointerMove({ x: 150, y: 130 });
        expect(api.update).toHaveBeenLastCalledWith('s1', { x: 140, y: 120 }, 'stamp-move:s1');
        sel.onPointerUp();
        sel.onPointerMove({ x: 0, y: 0 });
        expect(api.update).toHaveBeenCalledTimes(1);
    });
});
