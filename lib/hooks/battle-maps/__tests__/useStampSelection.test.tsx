// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, type Mock, vi } from 'vitest';

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

    it('in place mode R/F turn the ghost and stamp shortcuts are ignored', () => {
        const { api, sel } = setup();

        expect(sel.onKey(key({ key: 'r' }), 'stamp')).toBe(true);
        expect(api.rotateGhost).toHaveBeenCalledWith(1);
        sel.onKey(key({ key: 'F' }), 'stamp');
        expect(api.flipGhost).toHaveBeenCalled();
        expect(sel.onKey(key({ key: 'Delete' }), 'stamp')).toBe(false);
        expect(sel.onKey(key({ key: 'd', metaKey: true }), 'stamp')).toBe(false);
        expect(sel.onKey(key({ key: ']' }), 'stamp')).toBe(false);
        expect(api.update).not.toHaveBeenCalled();
        expect(api.remove).not.toHaveBeenCalled();
        expect(api.reorder).not.toHaveBeenCalled();
    });

    it('ignores keys while a dialog is open', () => {
        const { api, sel } = setup();

        const dialog = document.createElement('div');

        dialog.setAttribute('role', 'dialog');
        document.body.append(dialog);
        expect(sel.onKey(key({ key: 'Delete' }))).toBe(false);
        expect(api.remove).not.toHaveBeenCalled();
        dialog.remove();
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

        const [id, patch, coalesce] = (api.update as unknown as Mock).mock.calls[0];

        expect(id).toBe('s1');
        expect(patch.rot % 15).toBeCloseTo(0, 6);
        expect(coalesce).toBe('stamp-rot:s1:0');
    });

    it('scales relative to the first handle distance', () => {
        const { api, sel } = setup();

        sel.onScaleHandle({ x: 200, y: 100 });
        sel.onScaleHandle({ x: 300, y: 100 });

        expect(api.update).toHaveBeenLastCalledWith('s1', { scale: 2 }, 'stamp-scale:s1:0');
    });

    it('drags with the pointer offset and a move coalesce key', () => {
        const { api, sel } = setup();

        expect(sel.onPointerDown({ x: 110, y: 110 })).toBe('s1');
        expect(api.select).toHaveBeenCalledWith('s1');
        sel.onPointerMove({ x: 150, y: 130 });
        expect(api.update).toHaveBeenLastCalledWith('s1', { x: 140, y: 120 }, 'stamp-move:s1:0');
        sel.onPointerUp();
        sel.onPointerMove({ x: 0, y: 0 });
        expect(api.update).toHaveBeenCalledTimes(1);
    });

    it('uses a fresh coalesce key for each drag', () => {
        const { api, sel } = setup();

        sel.onPointerDown({ x: 110, y: 110 });
        sel.onPointerMove({ x: 120, y: 110 });
        sel.onPointerUp();
        sel.onPointerDown({ x: 110, y: 110 });
        sel.onPointerMove({ x: 120, y: 110 });

        const keys = (api.update as unknown as Mock).mock.calls.map((c: unknown[]) => c[2]);

        expect(new Set(keys).size).toBe(2);
    });

    it('uses separate coalesce keys for separate rotate, scale and wheel gestures', () => {
        const { api, sel } = setup();

        sel.onRotateHandle({ x: 200, y: 100 });
        sel.onPointerUp();
        sel.onRotateHandle({ x: 200, y: 150 });
        sel.onScaleHandle({ x: 200, y: 100 });
        sel.onPointerUp();
        sel.onScaleHandle({ x: 200, y: 100 });
        sel.onWheel(-1);
        sel.onPointerUp();
        sel.onWheel(-1);

        const keys = (api.update as unknown as Mock).mock.calls.map((c: unknown[]) => c[2]);

        expect(new Set(keys).size).toBe(6);
    });

    it('reports no hit on empty space so the pan can take the gesture', () => {
        const { sel } = setup();

        expect(sel.onPointerDown({ x: 700, y: 700 })).toBeNull();
    });
});
