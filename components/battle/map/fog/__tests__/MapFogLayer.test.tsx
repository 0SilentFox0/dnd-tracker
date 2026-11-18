// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapFogLayer } from '../MapFogLayer';

import type { BattleMapConfig } from '@/types/battle-grid';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const map: BattleMapConfig = { cols: 3, rows: 2, background: null, opacity: 0.3 };

function mockContext() {
    const fillRect = vi.fn();

    const styles: string[] = [];

    const context = {
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        fillRect,
        set fillStyle(value: string) {
            styles.push(value);
        },
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        context as unknown as CanvasRenderingContext2D
    );

    return { fillRect, styles };
}

const props = {
    map,
    cellPx: 10,
    revealed: [] as [number, number, number][],
    visible: new Set<string>(),
    explored: new Set<string>(),
    dmEditing: false,
};

describe('MapFogLayer', () => {
    it('renders nothing when fog is off', () => {
        const { container } = render(<MapFogLayer {...props} mode="off" />);

        expect(container.querySelector('canvas')).toBeNull();
    });

    it('covers every cell a player cannot see, dimmer for explored ones', () => {
        const { fillRect, styles } = mockContext();

        render(
            <MapFogLayer
                {...props}
                mode="vision"
                visible={new Set(['0:0'])}
                explored={new Set(['0:0', '1:0'])}
            />
        );

        expect(fillRect).toHaveBeenCalledTimes(5);
        expect(styles.filter((s) => s.includes('0.48'))).toHaveLength(1);
        expect(styles.filter((s) => s.includes('0.88'))).toHaveLength(4);
    });

    it('shows the DM everything in vision mode and only revealed runs in reveal mode', () => {
        const vision = mockContext();

        render(<MapFogLayer {...props} mode="vision" dmEditing />);
        expect(vision.fillRect).not.toHaveBeenCalled();

        cleanup();

        const reveal = mockContext();

        render(
            <MapFogLayer {...props} mode="reveal" dmEditing revealed={[[0, 0, 2]]} />
        );

        expect(reveal.fillRect).toHaveBeenCalledTimes(4);
    });
});
