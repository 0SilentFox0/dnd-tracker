import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ROOT } from './helpers/static-graph';

import {
    currentCycles,
    diffBaseline,
    findSccs,
    type Graph,
    importsOf,
    readBaseline,
} from '@/scripts/shared/cycles';

describe('import cycles ratchet', () => {
    it('matches the baseline', () => {
        const { added, removed } = diffBaseline(
            currentCycles(),
            readBaseline()
        );

        expect(added, 'new import cycle: break it').toEqual([]);
        expect(
            removed,
            'a cycle is gone: shrink the baseline (pnpm cycles --write)'
        ).toEqual([]);
    });
});

describe('findSccs', () => {
    it('groups a -> b -> c -> a into one SCC', () => {
        const graph: Graph = new Map([
            ['a', ['b']],
            ['b', ['c']],
            ['c', ['a', 'd']],
            ['d', []],
        ]);

        expect(findSccs(graph)).toEqual([['a', 'b', 'c']]);
    });

    it('ignores acyclic graphs and reports self-imports', () => {
        expect(
            findSccs(
                new Map([
                    ['a', ['b']],
                    ['b', []],
                ])
            )
        ).toEqual([]);
        expect(findSccs(new Map([['a', ['a']]]))).toEqual([['a']]);
    });
});

describe('importsOf', () => {
    const file = path.join(ROOT, 'lib/__tests__/x.ts');

    it('resolves the @/ alias', () => {
        expect(importsOf(file, `import { prisma } from '@/lib/db';`)).toEqual([
            'lib/db.ts',
        ]);
    });

    it('ignores type-only imports', () => {
        expect(
            importsOf(
                file,
                `import type { A } from '@/lib/db';\nimport { type B } from '@/lib/db';`
            )
        ).toEqual([]);
    });
});
