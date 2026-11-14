import { describe, expect, it } from 'vitest';

import {
    gridLinesPath,
    regionFillPath,
    regionOutlinePath,
    rowRuns,
    windowPath,
} from '../region-path';

const U = 100;

const segments = (d: string) => d.split('M').filter(Boolean);

describe('rowRuns', () => {
    it('порожньо', () => {
        expect(rowRuns([]).size).toBe(0);
    });

    it('склеює сусідні x і сортує за y', () => {
        const runs = rowRuns(['3:1', '0:0', '1:0', '2:0', '5:0']);

        expect([...runs.keys()]).toEqual([0, 1]);
        expect(runs.get(0)).toEqual([
            [0, 3],
            [5, 6],
        ]);
        expect(runs.get(1)).toEqual([[3, 4]]);
    });
});

describe('regionFillPath', () => {
    it('порожня множина', () => {
        expect(regionFillPath([])).toBe('');
        expect(regionOutlinePath([])).toBe('');
    });

    it('одна клітинка — квадрат', () => {
        expect(regionFillPath(['2:1'])).toBe(`M${2 * U} ${U}h${U}v${U}h-${U}z`);
    });

    it('рядок 0..3 — один відрізок', () => {
        const d = regionFillPath(['0:0', '1:0', '2:0', '3:0']);

        expect(segments(d)).toHaveLength(1);
        expect(d).toBe(`M0 0h${4 * U}v${U}h-${4 * U}z`);
    });

    it('детермінований за порядком вводу', () => {
        const keys = ['1:1', '0:0', '5:5', '1:0'];

        expect(regionFillPath(keys)).toBe(regionFillPath([...keys].reverse()));
        expect(regionOutlinePath(keys)).toBe(
            regionOutlinePath([...keys].reverse())
        );
    });

    it('дві несуміжні області — два підшляхи', () => {
        expect(segments(regionFillPath(['0:0', '5:5']))).toHaveLength(2);
    });
});

describe('regionOutlinePath', () => {
    it('одна клітинка — 4 відрізки', () => {
        const d = regionOutlinePath(['0:0']);

        expect(segments(d).sort()).toEqual(
            [`0 0h${U}`, `0 ${U}h${U}`, `0 0v${U}`, `${U} 0v${U}`].sort()
        );
    });

    it('рядок 0..3 склеює колінеарні ребра', () => {
        const d = regionOutlinePath(['0:0', '1:0', '2:0', '3:0']);

        expect(segments(d)).toHaveLength(4);
        expect(d).toContain(`M0 0h${4 * U}`);
        expect(d).toContain(`M0 ${U}h${4 * U}`);
    });

    it('бублик 3x3 без центру має внутрішній контур', () => {
        const ring = [] as string[];

        for (let y = 0; y < 3; y++)
            for (let x = 0; x < 3; x++)
                if (x !== 1 || y !== 1) ring.push(`${x}:${y}`);

        const d = regionOutlinePath(ring);

        expect(segments(d)).toHaveLength(8);
        expect(d).toContain(`M${U} ${U}h${U}`);
        expect(d).toContain(`M${U} ${U}v${U}`);
        expect(d).toContain(`M${2 * U} ${U}v${U}`);
        expect(d).toContain(`M${U} ${2 * U}h${U}`);
    });
});

describe('gridLinesPath', () => {
    it('2x1', () => {
        expect(gridLinesPath(2, 1)).toBe(
            `M0 0H${2 * U}M0 ${U}H${2 * U}M0 0V${U}M${U} 0V${U}M${2 * U} 0V${U}`
        );
    });
});

describe('windowPath', () => {
    it('вікно на всю карту дає дві однакові рамки', () => {
        const d = windowPath(
            { cols: 4, rows: 3 },
            { x: 0, y: 0, cols: 4, rows: 3 }
        );

        const [a, b] = segments(d);

        expect(a).toBe(b);
    });

    it('внутрішня рамка зміщена', () => {
        const d = windowPath(
            { cols: 4, rows: 3 },
            { x: 1, y: 1, cols: 2, rows: 1 }
        );

        expect(segments(d)[1]).toBe(`${U} ${U}h${2 * U}v${U}h-${2 * U}z`);
    });
});
