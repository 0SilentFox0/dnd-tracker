// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArtStampsLayer } from '../ArtStampsLayer';

import type { EditorStamps } from '@/lib/hooks/battle-maps';
import type { BattleMapConfig } from '@/types/battle-grid';

vi.mock('../svg-point', () => ({
    svgPoint: (e: { clientX: number; clientY: number }) => ({ x: e.clientX, y: e.clientY }),
}));

afterEach(cleanup);

const map = { cols: 8, rows: 8, gridType: 'square' } as BattleMapConfig;

const stamp = {
    id: 's1',
    asset: 'altar',
    x: 150,
    y: 150,
    rot: 0,
    scale: 1,
    flip: false,
    z: 0,
};

const setup = () => {
    const parentDown = vi.fn();

    const api = {
        selectedId: null,
        select: vi.fn(),
        update: vi.fn(),
        asset: null,
        ghost: { rot: 0, flip: false },
        showAllBlocking: false,
    } as unknown as EditorStamps;

    const { container } = render(
        <div onPointerDown={parentDown}>
            <svg>
                <ArtStampsLayer
                    stamps={[stamp]}
                    map={map}
                    editing={{ mode: 'stamp-select', api }}
                />
            </svg>
        </div>
    );

    const surface = container.querySelector('[data-art-stamps-surface]') as SVGRectElement;

    surface.setPointerCapture = vi.fn();

    return { parentDown, api, surface };
};

describe('ArtStampsLayer select mode', () => {
    it('keeps a pointerdown on a stamp away from the camera pan', () => {
        const { parentDown, api, surface } = setup();

        fireEvent.pointerDown(surface, { pointerId: 1, clientX: 150, clientY: 150 });
        expect(api.select).toHaveBeenCalledWith('s1');
        expect(parentDown).not.toHaveBeenCalled();
    });

    it('lets a pointerdown on empty space bubble so the map can pan', () => {
        const { parentDown, api, surface } = setup();

        fireEvent.pointerDown(surface, { pointerId: 1, clientX: 700, clientY: 700 });
        expect(api.select).toHaveBeenCalledWith(null);
        expect(parentDown).toHaveBeenCalledTimes(1);
    });
});
