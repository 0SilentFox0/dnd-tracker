// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapTerrainToolbar } from '../MapTerrainToolbar';

import type { MapTerrainTool } from '@/lib/hooks/battle';

const touch = vi.hoisted(() => ({ value: false }));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useCoarsePointer: () => touch.value,
}));

afterEach(cleanup);

const tool = {
    brush: {
        kind: 'wall',
        rounds: 1,
        label: '',
        dice: '',
        damageType: 'fire',
    },
    setBrush: vi.fn(),
} as unknown as MapTerrainTool;

const edgeButton = () =>
    screen.getByRole('button', {
        name: 'battle.map.terrain.brushes.edge-wall',
    }) as HTMLButtonElement;

describe('MapTerrainToolbar: інструменти ребер', () => {
    it('звичайна карта: кнопки ребер активні, без підказки', () => {
        touch.value = false;
        render(<MapTerrainToolbar tool={tool} />);

        expect(edgeButton().disabled).toBe(false);
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('режим із конфігом: кнопки ребер вимкнені з поясненням з форми', () => {
        touch.value = false;
        render(<MapTerrainToolbar tool={tool} edgesInMode />);

        expect(edgeButton().disabled).toBe(true);
        expect(
            screen.getByText('battleSetup.map.edgesDisabledMode')
        ).toBeTruthy();
        expect(
            (
                screen.getByRole('button', {
                    name: 'battle.map.terrain.brushes.wall',
                }) as HTMLButtonElement
            ).disabled
        ).toBe(false);
    });

    it("дотик: кнопок ребер немає, є підказка про комп'ютер", () => {
        touch.value = true;
        render(<MapTerrainToolbar tool={tool} />);

        expect(
            screen.queryByRole('button', {
                name: 'battle.map.terrain.brushes.edge-wall',
            })
        ).toBeNull();
        expect(
            screen.getByText('battleSetup.map.edgesDesktopOnly')
        ).toBeTruthy();
    });
});
