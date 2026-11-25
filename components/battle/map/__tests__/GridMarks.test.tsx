// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const spy = vi.hoisted(() => ({ fill: vi.fn() }));

vi.mock('@/lib/utils/battle/grid', async (orig) => {
    const mod = await orig<typeof import('@/lib/utils/battle/grid')>();

    return {
        ...mod,
        regionFillPath: (keys: string[]) => {
            spy.fill(keys);

            return mod.regionFillPath(keys);
        },
    };
});

import { GridMarks } from '../grid/GridMarks';

import { regionOutlinePath } from '@/lib/utils/battle/grid';
import type { BattleMapConfig } from '@/types/battle-grid';

const map = { cols: 6, rows: 6, opacity: 0.3 } as BattleMapConfig;

const blocked = new Set(['0:0', '1:0']);

const renderMarks = (marks: Map<string, string>, through?: string[]) => (
    <svg>
        <GridMarks
            map={map}
            blocked={blocked}
            marks={marks as never}
            through={through}
            maskId="m"
        />
    </svg>
);

describe('GridMarks line mask', () => {
    it('does not rebuild the static mask when only sparse marks change', () => {
        const { rerender, container } = render(
            renderMarks(new Map([['2:2', 'target']]))
        );

        const calls = spy.fill.mock.calls.length;

        rerender(renderMarks(new Map([['3:3', 'target']])));
        rerender(renderMarks(new Map([['4:4', 'pick']])));

        expect(spy.fill.mock.calls.length).toBe(calls);
        expect(container.querySelector('mask path')).not.toBeNull();
    });

    it('keeps grid lines across move zones (mask holds only static cells)', () => {
        const { container } = render(renderMarks(new Map([['2:2', 'move']])));

        const d = container.querySelector('mask path')?.getAttribute('d');

        expect(d).toBeTruthy();
        expect(d).not.toContain('M200 200');
    });
});

describe('GridMarks zone look', () => {
    it('move: only a thin solid outline, no fill element', () => {
        const { container } = render(renderMarks(new Map([['2:2', 'move']])));

        expect(container.querySelector('[data-zone-fill]')).toBeNull();

        const outline = container.querySelector('[data-fx-zone="move"]')!;

        expect(outline.getAttribute('class')).toContain(
            'battle-map-reach-outline'
        );
        expect(outline.getAttribute('fill')).toBe('none');
        expect(outline.getAttribute('stroke-width')).toBe('1.5');
        expect(outline.getAttribute('stroke-dasharray')).toBeNull();
    });

    it('outline covers the union of move and move-danger cells with no danger visual', () => {
        const { container } = render(
            renderMarks(
                new Map([
                    ['2:2', 'move'],
                    ['3:2', 'move-danger'],
                ])
            )
        );

        const outlines = container.querySelectorAll('[data-fx-zone]');

        expect(outlines).toHaveLength(1);
        expect(outlines[0].getAttribute('d')).toBe(
            regionOutlinePath(['2:2', '3:2'])
        );
        expect(container.innerHTML).not.toContain('threat');
        expect(container.querySelector('[data-fx-zone="danger"]')).toBeNull();
    });

    it('outline does not wrap tokens passed through inside the zone', () => {
        const { container } = render(
            renderMarks(
                new Map([
                    ['2:2', 'move'],
                    ['4:2', 'move'],
                ]),
                ['3:2']
            )
        );

        expect(
            container.querySelector('[data-fx-zone="move"]')?.getAttribute('d')
        ).toBe(regionOutlinePath(['2:2', '3:2', '4:2']));
    });

    it('zones carry the fade class that the reduced-motion rule disables', () => {
        const { container } = render(renderMarks(new Map([['2:2', 'move']])));

        expect(
            container
                .querySelector('[data-fx-zone="move"]')
                ?.getAttribute('class')
        ).toContain('battle-map-zone');
    });

    it('range: a thin rect outline with no fill, absent without range', () => {
        const { container, rerender } = render(renderMarks(new Map()));

        expect(container.querySelector('[data-range-outline]')).toBeNull();

        rerender(
            <svg>
                <GridMarks
                    map={map}
                    blocked={blocked}
                    marks={undefined}
                    range={{ x: 1, y: 1, cols: 2, rows: 3 }}
                    maskId="m"
                />
            </svg>
        );

        const r = container.querySelector('[data-range-outline]')!;

        expect(r.getAttribute('d')).toBe('M100 100h200v300h-200z');
        expect(r.getAttribute('fill')).toBe('none');
        expect(r.getAttribute('class')).toContain('battle-map-range-outline');
        expect(container.querySelector('[data-out-of-range]')).toBeNull();
    });
});
