// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapFogLayer } from '../MapFogLayer';
import { mockCanvas } from './fog-canvas-mock';

import {
    CLEAR_EXPLORED,
    CLEAR_HIDDEN,
    CLEAR_VISIBLE,
} from '@/lib/utils/canvas/fog/fog-mask';
import type { BattleMapConfig } from '@/types/battle-grid';

vi.mock('@/lib/hooks/common', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/hooks/common')>()),
    useFogQuality: () => 'still',
}));

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const map: BattleMapConfig = { cols: 3, rows: 2, background: null, opacity: 0.3 };

const props = {
    map,
    cellPx: 10,
    revealed: [] as [number, number, number][],
    visible: new Set<string>(),
    explored: new Set<string>(),
    dmEditing: false,
};

function maskLevels(ctx: ReturnType<typeof mockCanvas>['ctx']) {
    const image = ctx.putImageData.mock.calls[0][0] as { data: Uint8ClampedArray };

    const cell = 4;

    const width = map.cols * cell;

    return Array.from({ length: map.rows * map.cols }, (_, i) => {
        const x = (i % map.cols) * cell;

        const y = Math.floor(i / map.cols) * cell;

        return image.data[(y * width + x) * 4 + 3];
    });
}

describe('MapFogLayer', () => {
    it('renders nothing when fog is off', () => {
        const { container } = render(<MapFogLayer {...props} mode="off" />);

        expect(container.querySelector('canvas')).toBeNull();
    });

    it('fogs every cell a player cannot see, thinner over explored ones', () => {
        const { ctx } = mockCanvas();

        render(
            <MapFogLayer
                {...props}
                mode="vision"
                visible={new Set(['0:0'])}
                explored={new Set(['0:0', '1:0'])}
            />
        );

        expect(maskLevels(ctx)).toEqual([
            CLEAR_VISIBLE,
            CLEAR_EXPLORED,
            CLEAR_HIDDEN,
            CLEAR_HIDDEN,
            CLEAR_HIDDEN,
            CLEAR_HIDDEN,
        ]);
    });

    it('shows the DM everything in vision mode and only revealed runs in reveal mode', () => {
        const vision = mockCanvas();

        render(<MapFogLayer {...props} mode="vision" dmEditing />);
        expect(new Set(maskLevels(vision.ctx))).toEqual(
            new Set([CLEAR_VISIBLE])
        );

        cleanup();

        const reveal = mockCanvas();

        render(
            <MapFogLayer {...props} mode="reveal" dmEditing revealed={[[0, 0, 2]]} />
        );

        expect(maskLevels(reveal.ctx)).toEqual([
            CLEAR_VISIBLE,
            CLEAR_VISIBLE,
            CLEAR_HIDDEN,
            CLEAR_HIDDEN,
            CLEAR_HIDDEN,
            CLEAR_HIDDEN,
        ]);
    });
});
