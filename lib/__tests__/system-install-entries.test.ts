import { describe, expect, it } from 'vitest';

import {
    appEntries,
    type Deps,
    fsDeps,
    INSTALL_PAIRS,
    unrooted,
} from './helpers/install-entries';

const PAIR = {
    lookup: 'lib/utils/rules/systems/lookup.ts',
    root: 'lib/utils/rules/systems/registry.ts',
};

const fake = (graph: Record<string, string[]>, dyn = {}): Deps => {
    const dynamic: Record<string, string[]> = dyn;

    return (file) => ({
        files: graph[file] ?? [],
        dynamic: dynamic[file] ?? [],
    });
};

describe('system install entries (fixtures)', () => {
    it('a route reaching a lookup without the root is red', () => {
        const deps = fake({
            'app/api/x/route.ts': ['lib/a.ts'],
            'lib/a.ts': [PAIR.lookup],
        });

        expect(unrooted(['app/api/x/route.ts'], [PAIR], deps)).toEqual([
            `app/api/x/route.ts -> ${PAIR.lookup}`,
        ]);
    });

    it('a static or a dynamic root turns it green', () => {
        const withRoot = fake({
            'app/api/x/route.ts': ['lib/a.ts', PAIR.root],
            'lib/a.ts': [PAIR.lookup],
        });

        const withDynamic = fake(
            {
                'app/api/x/route.ts': ['lib/a.ts'],
                'lib/a.ts': [PAIR.lookup],
            },
            { 'lib/a.ts': [PAIR.root] }
        );

        expect(unrooted(['app/api/x/route.ts'], [PAIR], withRoot)).toEqual([]);
        expect(unrooted(['app/api/x/route.ts'], [PAIR], withDynamic)).toEqual(
            []
        );
    });

    it('an entry that never reaches a lookup needs no root', () => {
        const deps = fake({ 'app/api/x/route.ts': ['lib/a.ts'] });

        expect(unrooted(['app/api/x/route.ts'], [PAIR], deps)).toEqual([]);
    });
});

describe('system install entries', () => {
    it('every route and page that reaches a lookup reaches its root', () => {
        expect(
            unrooted(appEntries(), INSTALL_PAIRS, fsDeps()),
            'add the install root import to the entry (or a file on its path)'
        ).toEqual([]);
    });
});
