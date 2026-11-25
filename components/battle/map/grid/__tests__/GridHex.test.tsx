// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GridHit } from '../GridHit';
import { GridMarks } from '../GridMarks';
import { GridStatic } from '../GridStatic';

import { hexCenter, hexPolygon } from '@/lib/utils/battle/grid/hex';
import type { BattleMapConfig } from '@/types/battle-grid';

afterEach(cleanup);

const base: BattleMapConfig = {
    cols: 5,
    rows: 4,
    background: null,
    opacity: 0.3,
};

const hexMap: BattleMapConfig = { ...base, gridType: 'hex' };

describe('GridStatic on hex', () => {
    it('draws a region as one path of hex sub-paths', () => {
        const map: BattleMapConfig = {
            ...hexMap,
            terrain: {
                '1:1': { kind: 'wall' },
                '2:1': { kind: 'wall' },
            },
        };

        const { container } = render(
            <svg>
                <GridStatic
                    map={map}
                    blocked={new Set()}
                    window={null}
                    rotated={false}
                />
            </svg>
        );

        const paths = container.querySelectorAll('[data-terrain="wall"] path');

        expect(paths).toHaveLength(1);
        expect(paths[0].getAttribute('d')?.match(/z/g)).toHaveLength(2);
    });

    it('keeps the square rect path', () => {
        const { container } = render(
            <svg>
                <GridStatic
                    map={{ ...base, terrain: { '0:0': { kind: 'wall' } } }}
                    blocked={new Set()}
                    window={null}
                    rotated={false}
                />
            </svg>
        );

        expect(
            container
                .querySelector('[data-terrain="wall"] path')
                ?.getAttribute('d')
        ).toBe('M0 0h100v100h-100z');
    });
});

describe('GridMarks', () => {
    const marks = new Map([['1:1', 'target' as const]]);

    it('draws template targets as hex polygons on hex', () => {
        const { container } = render(
            <svg>
                <GridMarks
                    map={hexMap}
                    blocked={new Set()}
                    marks={marks}
                    maskId="m"
                />
            </svg>
        );

        expect(
            container
                .querySelector('[data-mark-cell="1:1"]')
                ?.getAttribute('points')
        ).toBe(hexPolygon({ x: 1, y: 1 }));
    });

    it('draws the exact hex disk outline for a range', () => {
        const { container } = render(
            <svg>
                <GridMarks
                    map={hexMap}
                    blocked={new Set()}
                    marks={undefined}
                    range={{ x: 0, y: 0, cols: 1, rows: 1, cells: ['0:0'] }}
                    maskId="m"
                />
            </svg>
        );

        expect(
            container
                .querySelector('[data-range-outline]')
                ?.getAttribute('d')
                ?.match(/M/g)
        ).toHaveLength(6);
    });

    it('square target stays a 4-point polygon and range a rectangle', () => {
        const { container } = render(
            <svg>
                <GridMarks
                    map={base}
                    blocked={new Set()}
                    marks={marks}
                    range={{ x: 1, y: 1, cols: 2, rows: 2 }}
                    maskId="m"
                />
            </svg>
        );

        expect(
            container
                .querySelector('[data-mark-cell="1:1"]')
                ?.getAttribute('points')
                ?.split(' ')
        ).toHaveLength(4);
        expect(
            container.querySelector('[data-range-outline]')?.getAttribute('d')
        ).toBe('M100 100h200v200h-200z');
    });
});

describe('GridHit on hex', () => {
    it('resolves the clicked hex cell and sizes the hit rect by hex map size', () => {
        const onCellClick = vi.fn();

        const svgRef = { current: null as SVGSVGElement | null };

        const { container } = render(
            <svg
                data-fx-grid=""
                ref={(el) => {
                    svgRef.current = el;
                }}
            >
                <GridHit
                    map={hexMap}
                    blocked={new Set()}
                    cellActions={{
                        onCellClick,
                        wasDragged: () => false,
                        svgRef,
                    }}
                    scene={{}}
                />
            </svg>
        );

        const svg = container.querySelector('svg') as SVGSVGElement;

        svg.getScreenCTM = () =>
            ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) as DOMMatrix;

        const rect = container.querySelector('[data-grid-hit]') as Element;

        expect(rect.getAttribute('width')).toBe('400');

        const c = hexCenter({ x: 3, y: 2 });

        fireEvent.click(rect, { clientX: c.x, clientY: c.y });

        expect(onCellClick).toHaveBeenCalledWith({ x: 3, y: 2 });
    });
});
