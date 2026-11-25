import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    scanGridCalls,
    scannedFiles,
    scanRawUnit,
    unitFiles,
} from './helpers/grid-calls';
import { ROOT } from './helpers/static-graph';

const EXEMPT_PATH = path.join(ROOT, 'ratchets/grid-square-only.json');

const EXEMPT: Record<string, string> = JSON.parse(
    fs.readFileSync(EXEMPT_PATH, 'utf8')
);

const UNIT_PREFIX = 'unit:';

const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const GRID =
    "import { cellsOf, footprint, sizeOf, cellDistance, isAdjacent } from '@/lib/utils/battle/grid';\n";

describe('grid-aware call ratchet: fixtures', () => {
    it('flags a call with fewer args than the full arity', () => {
        const v = scanGridCalls(
            'lib/utils/battle/x.ts',
            `${GRID}cellsOf(p); isAdjacent(a, b);`
        );

        expect(v.map((x) => x.kind)).toEqual(['arity', 'arity']);
    });

    it('accepts a full call and ignores spread args', () => {
        expect(
            scanGridCalls(
                'lib/utils/battle/x.ts',
                `${GRID}cellsOf(p, grid); cellDistance(...pair);`
            )
        ).toEqual([]);
    });

    it('flags a point-free reference', () => {
        const v = scanGridCalls(
            'lib/utils/battle/x.ts',
            `${GRID}list.flatMap(cellsOf);`
        );

        expect(v.map((x) => x.kind)).toEqual(['ref']);
    });

    it('flags footprint with sizeOf and sizeOf multiplication', () => {
        const v = scanGridCalls(
            'lib/utils/battle/x.ts',
            `${GRID}footprint(a, sizeOf(p), grid); const w = sizeOf(p) * 2;`
        );

        expect(v.map((x) => x.kind)).toEqual(['size', 'size']);
    });

    it('allows sizeOf use inside occupancy.ts', () => {
        expect(
            scanGridCalls(
                'lib/utils/battle/grid/occupancy.ts',
                `${GRID}footprint(a, sizeOf(p), grid);`
            )
        ).toEqual([]);
    });

    it("flags the literal 'square' as grid", () => {
        const v = scanGridCalls(
            'lib/utils/battle/x.ts',
            `${GRID}cellDistance(a, b, 'square');`
        );

        expect(v.map((x) => x.kind)).toEqual(['literal']);
    });

    it('ignores same-named locals not imported from grid', () => {
        expect(
            scanGridCalls(
                'lib/utils/battle/x.ts',
                'const cellsOf = (p) => p; cellsOf(p); [].map(cellsOf);'
            )
        ).toEqual([]);
    });

    it('flags raw * UNIT only when UNIT comes from layout', () => {
        const imp = "import { UNIT } from '@/lib/utils/battle/grid/layout';\n";

        expect(
            scanRawUnit(
                'components/battle/map/a.tsx',
                `${imp}const w = cols * UNIT; const h = UNIT * rows;`
            ).map((x) => x.kind)
        ).toEqual(['unit', 'unit']);
        expect(
            scanRawUnit(
                'components/battle/map/a.tsx',
                'const UNIT = 2; const w = cols * UNIT;'
            )
        ).toEqual([]);
        expect(
            scanRawUnit('lib/utils/battle/grid/layout.ts', `${imp}cols * UNIT`)
        ).toEqual([]);
    });
});

describe('grid-aware call ratchet: repo', () => {
    const found = new Map<string, string[]>();

    for (const f of scannedFiles()) {
        const v = scanGridCalls(f, read(f)).map(
            (x) => `${f}:${x.line} ${x.text}`
        );

        if (v.length) found.set(f, v);
    }

    for (const f of unitFiles()) {
        const v = scanRawUnit(f, read(f)).map(
            (x) => `${f}:${x.line} ${x.text}`
        );

        if (v.length) found.set(UNIT_PREFIX + f, v);
    }

    it('has no violations outside the exempt list', () => {
        const fresh = [...found.entries()]
            .filter(([k]) => !(k in EXEMPT))
            .flatMap(([, v]) => v);

        expect(fresh).toEqual([]);
    });

    it('keeps the exempt list shrinking: every entry still violates', () => {
        const stale = Object.keys(EXEMPT).filter((k) => !found.has(k));

        expect(stale).toEqual([]);
    });
});
