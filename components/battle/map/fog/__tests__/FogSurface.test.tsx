// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FogSurface } from '../FogSurface';
import { mockCanvas } from './fog-canvas-mock';

const ticks: ((now: number) => void)[] = [];

const unsubscribe = vi.fn();

vi.mock('@/lib/utils/canvas/ticker', () => ({
    subscribe: (fn: (now: number) => void) => {
        ticks.push(fn);

        return unsubscribe;
    },
}));

const motion = {
    canvas: document.createElement('canvas'),
    render: vi.fn(() => true),
    release: vi.fn(),
};

vi.mock('@/lib/utils/canvas/fog/cloud-motion', () => ({
    acquireCloudMotion: () => motion,
}));

const grid = { cols: 4, rows: 3, cellPx: 10, window: null };

const empty = new Set<string>();

beforeEach(() => {
    ticks.length = 0;
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
});

describe('FogSurface', () => {
    it('flat fills with the flat token colour and carves the mask', () => {
        const { ctx, fills, drawn } = mockCanvas();

        const { container } = render(
            <FogSurface
                grid={grid}
                visible={new Set(['0:0'])}
                explored={empty}
                quality="flat"
            />
        );

        expect(
            container.querySelector('[data-fog-quality="flat"]')
        ).not.toBeNull();
        expect(fills.length).toBeGreaterThan(0);
        expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 40, 30);
        expect(drawn.some((d) => d.op === 'destination-out')).toBe(true);
        expect(ticks).toHaveLength(0);
    });

    it('still paints a static cloud once and never subscribes to the ticker', () => {
        const { drawn } = mockCanvas();

        render(
            <FogSurface
                grid={grid}
                visible={new Set(['0:0'])}
                explored={empty}
                quality="still"
            />
        );

        expect(drawn.some((d) => d.op === 'source-over')).toBe(true);
        expect(drawn.some((d) => d.op === 'destination-out')).toBe(true);
        expect(ticks).toHaveLength(0);
        expect(motion.render).not.toHaveBeenCalled();
    });

    it('live drifts through the ticker and releases the shared context on unmount', () => {
        mockCanvas();

        const { unmount } = render(
            <FogSurface
                grid={grid}
                visible={new Set(['0:0'])}
                explored={empty}
                quality="live"
            />
        );

        expect(ticks).toHaveLength(1);

        act(() => ticks[0](1000));
        expect(motion.render).toHaveBeenLastCalledWith(1, expect.anything());

        unmount();
        expect(unsubscribe).toHaveBeenCalled();
        expect(motion.release).toHaveBeenCalledTimes(1);
    });

    it('dissolves newly visible cells over time when live', () => {
        const { drawn } = mockCanvas();

        const { rerender } = render(
            <FogSurface
                grid={grid}
                visible={new Set(['0:0'])}
                explored={empty}
                quality="live"
            />
        );

        rerender(
            <FogSurface
                grid={grid}
                visible={new Set(['0:0', '1:0'])}
                explored={empty}
                quality="live"
            />
        );

        const before = drawn.length;

        act(() => ticks[ticks.length - 1](performance.now() + 100));

        expect(drawn.slice(before).some((d) => d.op === 'lighter')).toBe(true);
    });

    it('reveals instantly when still', () => {
        const { drawn } = mockCanvas();

        const { rerender } = render(
            <FogSurface
                grid={grid}
                visible={new Set(['0:0'])}
                explored={empty}
                quality="still"
            />
        );

        rerender(
            <FogSurface
                grid={grid}
                visible={new Set(['0:0', '1:0'])}
                explored={empty}
                quality="still"
            />
        );

        expect(drawn.some((d) => d.op === 'lighter')).toBe(false);
    });

    it('sizes the canvas to the grid window only', () => {
        mockCanvas();

        const { container } = render(
            <FogSurface
                grid={{ ...grid, window: { x: 1, y: 1, cols: 2, rows: 1 } }}
                visible={empty}
                quality="still"
            />
        );

        const canvas = container.querySelector('canvas')!;

        expect(canvas.style.left).toBe('10px');
        expect(canvas.style.top).toBe('10px');
        expect(canvas.style.width).toBe('20px');
        expect(canvas.style.height).toBe('10px');
    });
});
