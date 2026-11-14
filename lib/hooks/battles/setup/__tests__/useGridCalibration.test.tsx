// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBattleMapEditor } from '../useBattleMapEditor';
import { useGridCalibration } from '../useGridCalibration';

import { DEFAULT_BATTLE_MAP } from '@/lib/constants/battle';

const sizes: Record<string, { width: number; height: number }> = {
    '/battle-maps/a.webp': { width: 1000, height: 600 },
    '/battle-maps/same.webp': { width: 1000, height: 600 },
    '/battle-maps/other.webp': { width: 800, height: 800 },
};

const confirm = vi.hoisted(() => vi.fn());

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useImageSize: (src: string | null) => (src ? (sizes[src] ?? null) : null),
    useConfirm: () => confirm,
}));

const setup = () =>
    renderHook(() => {
        const editor = useBattleMapEditor({
            ...DEFAULT_BATTLE_MAP,
            background: '/battle-maps/a.webp',
        });

        return { editor, cal: useGridCalibration(editor) };
    });

const outline = (
    r: ReturnType<typeof setup>['result'],
    from: { x: number; y: number },
    to: { x: number; y: number }
) => {
    act(() => r.current.cal.actions.start());
    act(() => r.current.cal.actions.press(from));
    act(() => r.current.cal.actions.drag(to));
};

beforeEach(() => confirm.mockReset().mockResolvedValue(true));

describe('useGridCalibration', () => {
    it('обведена клітинка задає масштаб, сітку й зсув; режим вимикається', () => {
        const { result } = setup();

        outline(result, { x: 150, y: 80 }, { x: 250, y: 180 });
        expect(result.current.cal.state.preview).toMatchObject({
            backgroundCols: 10,
            backgroundRows: 6,
        });

        act(() => result.current.cal.actions.commit());

        const { map } = result.current.editor.state;

        expect(map).toMatchObject({
            cols: 10,
            rows: 6,
            backgroundCols: 10,
            backgroundRows: 6,
        });
        expect(map.gridOffset?.x).toBeCloseTo(0.5);
        expect(map.gridOffset?.y).toBeCloseTo(0.8);
        expect(result.current.cal.state.mode).toBe('off');
        expect(result.current.cal.state.draft).toBeNull();
    });

    it('квадрат N×N ділить обведення на N', () => {
        const { result } = setup();

        act(() => result.current.cal.actions.setN(2));
        outline(result, { x: 0, y: 0 }, { x: 200, y: 200 });
        act(() => result.current.cal.actions.commit());

        expect(result.current.editor.state.map).toMatchObject({
            backgroundCols: 10,
            backgroundRows: 6,
        });
    });

    it('замалий прямокутник не застосовується', () => {
        const { result } = setup();

        outline(result, { x: 10, y: 10 }, { x: 11, y: 11 });
        expect(result.current.cal.state.preview).toBeNull();
        act(() => result.current.cal.actions.commit());
        expect(result.current.editor.state.map.backgroundRows).toBeUndefined();
    });

    it('скасування лишає карту як була', () => {
        const { result } = setup();

        outline(result, { x: 0, y: 0 }, { x: 100, y: 100 });
        act(() => result.current.cal.actions.cancel());

        expect(result.current.cal.state.mode).toBe('off');
        expect(result.current.editor.state.map.backgroundCols).toBeUndefined();
    });

    it('нуджинг у px рахується від impliedCellPx, у клітинках — від частки', () => {
        const { result } = setup();

        outline(result, { x: 0, y: 0 }, { x: 100, y: 100 });
        act(() => result.current.cal.actions.commit());
        expect(result.current.editor.state.cellPx).toBe(100);

        act(() => result.current.cal.actions.nudge(5, 0, 'px'));
        expect(result.current.editor.state.map.gridOffset?.x).toBeCloseTo(0.05);

        act(() => result.current.cal.actions.nudge(0, -0.1, 'cell'));
        expect(result.current.editor.state.map.gridOffset?.y).toBeCloseTo(0.9);
    });

    it('заміна фону на зображення того самого розміру: підтвердження повертає калібрування', async () => {
        const { result } = setup();

        outline(result, { x: 150, y: 80 }, { x: 250, y: 180 });
        act(() => result.current.cal.actions.commit());
        act(() =>
            result.current.editor.actions.setBackground(
                '/battle-maps/same.webp'
            )
        );

        expect(result.current.editor.state.map.backgroundRows).toBeUndefined();
        await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
        await waitFor(() =>
            expect(result.current.editor.state.map.backgroundRows).toBe(6)
        );
        expect(result.current.editor.state.map.gridOffset?.x).toBeCloseTo(0.5);
        expect(result.current.editor.state.pendingKeep).toBeNull();
    });

    it('відмова у підтвердженні лишає скинуте калібрування', async () => {
        confirm.mockResolvedValue(false);

        const { result } = setup();

        outline(result, { x: 0, y: 0 }, { x: 100, y: 100 });
        act(() => result.current.cal.actions.commit());
        act(() =>
            result.current.editor.actions.setBackground(
                '/battle-maps/same.webp'
            )
        );

        await waitFor(() =>
            expect(result.current.editor.state.pendingKeep).toBeNull()
        );
        expect(result.current.editor.state.map.backgroundRows).toBeUndefined();
        expect(result.current.editor.state.map.gridOffset).toBeUndefined();
    });

    it('інший розмір зображення скидає без запиту', async () => {
        const { result } = setup();

        outline(result, { x: 0, y: 0 }, { x: 100, y: 100 });
        act(() => result.current.cal.actions.commit());
        act(() =>
            result.current.editor.actions.setBackground(
                '/battle-maps/other.webp'
            )
        );

        await waitFor(() =>
            expect(result.current.editor.state.image).toEqual(
                sizes['/battle-maps/other.webp']
            )
        );
        expect(confirm).not.toHaveBeenCalled();
        expect(result.current.editor.state.pendingKeep).toBeNull();
        expect(result.current.editor.state.map.backgroundRows).toBeUndefined();
    });

    it('повзунок розміру клітинки скидає окремі рядки фону', () => {
        const { result } = setup();

        outline(result, { x: 0, y: 0 }, { x: 100, y: 50 });
        act(() => result.current.cal.actions.commit());
        expect(result.current.editor.state.map.backgroundRows).toBe(12);

        act(() => result.current.editor.actions.setCellSize(50));
        expect(result.current.editor.state.map.backgroundRows).toBeUndefined();
        expect(result.current.editor.state.map.backgroundCols).toBe(20);
    });
});
