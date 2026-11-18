// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clickCell, hoverCell, pressCell } from '../../__tests__/grid-pointer';
import { GridHit } from '../GridHit';

import type { BattleMapConfig } from '@/types/battle-grid';

afterEach(cleanup);

const map: BattleMapConfig = { cols: 4, rows: 4, background: null, opacity: 0.3 };

function setup(
    options: {
        blocked?: string[];
        clickableBlocked?: boolean;
        onStrokeStart?: () => void;
        wasDragged?: boolean;
    } = {}
) {
    const onCellClick = vi.fn();

    const onCellHover = vi.fn();

    const svgRef = { current: null as SVGSVGElement | null };

    const view = render(
        <svg
            data-fx-grid=""
            ref={(el) => {
                svgRef.current = el;
            }}
        >
            <GridHit
                map={map}
                blocked={new Set(options.blocked ?? [])}
                cellActions={{
                    onCellClick,
                    onCellHover,
                    wasDragged: () => options.wasDragged ?? false,
                    svgRef,
                }}
                onStrokeStart={options.onStrokeStart as never}
                scene={{ clickableBlocked: options.clickableBlocked }}
            />
        </svg>
    );

    return { ...view, onCellClick, onCellHover };
}

describe('GridHit', () => {
    it('reports the clicked cell', () => {
        const { container, onCellClick } = setup();

        clickCell(container, { x: 2, y: 1 });

        expect(onCellClick).toHaveBeenCalledWith({ x: 2, y: 1 });
    });

    it('ignores clicks that ended a drag', () => {
        const { container, onCellClick } = setup({ wasDragged: true });

        clickCell(container, { x: 0, y: 0 });

        expect(onCellClick).not.toHaveBeenCalled();
    });

    it('ignores blocked cells unless they are clickable', () => {
        const blocked = setup({ blocked: ['1:1'] });

        clickCell(blocked.container, { x: 1, y: 1 });
        expect(blocked.onCellClick).not.toHaveBeenCalled();

        cleanup();

        const open = setup({ blocked: ['1:1'], clickableBlocked: true });

        clickCell(open.container, { x: 1, y: 1 });
        expect(open.onCellClick).toHaveBeenCalledWith({ x: 1, y: 1 });
    });

    it('hover reports the cell, a blocked cell reports null, leaving reports null', () => {
        const { container, onCellHover } = setup({ blocked: ['3:3'] });

        hoverCell(container, { x: 1, y: 2 });
        expect(onCellHover).toHaveBeenLastCalledWith({ x: 1, y: 2 });

        hoverCell(container, { x: 3, y: 3 });
        expect(onCellHover).toHaveBeenLastCalledWith(null);

        fireEvent.pointerLeave(
            container.querySelector('[data-grid-hit]')?.parentElement as Element
        );
        expect(onCellHover).toHaveBeenLastCalledWith(null);
    });

    it('starts a stroke instead of clicking while painting', () => {
        const onStrokeStart = vi.fn();

        const { container, onCellClick, onCellHover } = setup({ onStrokeStart });

        pressCell(container, { x: 2, y: 2 });
        expect(onStrokeStart).toHaveBeenCalledWith(
            { x: 2, y: 2 },
            expect.anything()
        );

        clickCell(container, { x: 2, y: 2 });
        hoverCell(container, { x: 0, y: 0 });

        expect(onCellClick).not.toHaveBeenCalled();
        expect(onCellHover).not.toHaveBeenCalled();
    });
});
