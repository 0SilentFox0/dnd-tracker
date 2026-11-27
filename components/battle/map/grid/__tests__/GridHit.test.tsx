// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clickCell, hoverCell, pressCell } from '../../__tests__/grid-pointer';
import { GridHit } from '../GridHit';

import { UNIT } from '@/lib/utils/battle/grid';
import type { BattleMapConfig } from '@/types/battle-grid';

afterEach(cleanup);

const map: BattleMapConfig = { cols: 4, rows: 4, background: null, opacity: 0.3 };

function setup(
    options: {
        blocked?: string[];
        clickableBlocked?: boolean;
        onStrokeStart?: () => void;
        wasDragged?: boolean;
        tokenDrag?: string[];
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
                    tokenDrag: options.tokenDrag && new Set(options.tokenDrag),
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

    describe('token drag', () => {
        const down = { x: 0, y: 0 };

        const dragTo = (container: HTMLElement, p: { x: number; y: number }) => {
            pressCell(container, down);
            fireEvent.pointerMove(
                container.querySelector('[data-grid-hit]') as Element,
                {
                    pointerId: 1,
                    clientX: (2 + 0.5) * UNIT,
                    clientY: (2 + 0.5) * UNIT,
                }
            );
            fireEvent.pointerUp(
                container.querySelector('[data-grid-hit]') as Element,
                {
                    pointerId: 1,
                    clientX: (p.x + 0.5) * UNIT,
                    clientY: (p.y + 0.5) * UNIT,
                }
            );
        };

        it('drop on another cell goes through the click path and swallows the click', () => {
            const { container, onCellClick } = setup({ tokenDrag: ['0:0'] });

            dragTo(container, { x: 2, y: 2 });
            clickCell(container, { x: 2, y: 2 });

            expect(onCellClick).toHaveBeenCalledTimes(1);
            expect(onCellClick).toHaveBeenCalledWith({ x: 2, y: 2 });
        });

        it('drop on the origin cell cancels', () => {
            const { container, onCellClick } = setup({ tokenDrag: ['0:0'] });

            dragTo(container, { x: 0, y: 0 });

            expect(onCellClick).not.toHaveBeenCalled();
        });

        it('a plain press without movement stays a click', () => {
            const { container, onCellClick } = setup({ tokenDrag: ['0:0'] });

            pressCell(container, down);
            clickCell(container, down);

            expect(onCellClick).toHaveBeenCalledWith(down);
        });
    });
});
