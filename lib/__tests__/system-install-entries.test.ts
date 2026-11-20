import { describe, expect, it } from 'vitest';

import {
    appEntries,
    type Deps,
    fsDeps,
    INSTALL_PAIRS,
    scriptEntries,
    unrooted,
} from './helpers/install-entries';

// reach lookup only through client-safe reads (undefined/false before install); no root on static pages
const STATIC_SAFE = [
    'app/(auth)/forgot-password/page.tsx',
    'app/(auth)/reset-password/page.tsx',
    'app/(auth)/sign-in/[[...sign-in]]/page.tsx',
    'app/(auth)/sign-up/[[...sign-up]]/page.tsx',
    'app/campaigns/new/page.tsx',
    'app/dev/battle-map/page.tsx',
    'app/dev/fx-lab/page.tsx',
    'app/dev/fx-spells/page.tsx',
    'app/help/page.tsx',
    'app/page.tsx',
    'app/library/sounds/page.tsx',
    'app/profile/page.tsx',
    'app/settings/ai/page.tsx',
    'app/settings/password/page.tsx',
    'app/settings/preferences/page.tsx',
    'app/uk/page.tsx',
];

// reaches a lookup only through the hooks barrel (JoinCampaignDialog) and never calls `*Of`: no campaign, so no composition to gate on
const CLIENT_LAZY = ['app/campaigns/page.tsx'];

// layouts above every gate: they reach lookups only through guarded reads (`classesEnabled` checks `isInstalled`, `ruleSystemByKey` returns undefined before install)
const LAYOUT_SAFE = [
    'app/layout.tsx',
    'app/campaigns/[id]/layout.tsx',
    'app/help/layout.tsx',
    'app/library/sounds/layout.tsx',
    'app/profile/layout.tsx',
    'app/settings/layout.tsx',
];

const PAIR = {
    lookup: 'lib/utils/rules/systems/lookup.ts',
    root: 'lib/utils/rules/systems/registry.ts',
};

const fake = (
    graph: Record<string, string[]>,
    dyn: Record<string, string[]> = {},
    client: string[] = []
): Deps => {
    const clientFiles = new Set(client);

    return (file) => ({
        files: graph[file] ?? [],
        dynamic: dyn[file] ?? [],
        client: clientFiles.has(file),
    });
};

const SERVER_ROOT = 'lib/server/systems/registry.ts';

describe('system install entries (fixtures)', () => {
    it('a route reaching a lookup without the root is red', () => {
        const deps = fake({
            'app/api/x/route.ts': ['lib/a.ts'],
            'lib/a.ts': [PAIR.lookup],
        });

        expect(unrooted(['app/api/x/route.ts'], [PAIR], deps)).toEqual([
            `app/api/x/route.ts -> ${PAIR.lookup} [server]`,
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

    it('a server root imported by the page does not rescue a client component', () => {
        const deps = fake(
            {
                'app/p/page.tsx': ['components/Client.tsx', SERVER_ROOT],
                'components/Client.tsx': ['lib/a.ts'],
                'lib/a.ts': [PAIR.lookup],
                [SERVER_ROOT]: [PAIR.root],
            },
            {},
            ['components/Client.tsx']
        );

        expect(unrooted(['app/p/page.tsx'], [PAIR], deps)).toEqual([
            `app/p/page.tsx -> ${PAIR.lookup} [client]`,
        ]);
    });

    it('the lookup read on the server needs the server root even when the client side is rooted', () => {
        const deps = fake(
            {
                'app/p/page.tsx': ['components/Client.tsx', 'lib/a.ts'],
                'components/Client.tsx': [PAIR.root],
                'lib/a.ts': [PAIR.lookup],
            },
            {},
            ['components/Client.tsx']
        );

        expect(unrooted(['app/p/page.tsx'], [PAIR], deps)).toEqual([
            `app/p/page.tsx -> ${PAIR.lookup} [server]`,
        ]);
    });

    it('a gate or root reached through the client boundary turns the client side green', () => {
        const withGate = fake(
            {
                'app/p/page.tsx': [
                    'components/Client.tsx',
                    'components/Gate.tsx',
                ],
                'components/Client.tsx': ['lib/a.ts'],
                'components/Gate.tsx': ['components/systems/install.ts'],
                'lib/a.ts': [PAIR.lookup],
            },
            {},
            ['components/Client.tsx', 'components/Gate.tsx']
        );

        expect(
            unrooted(
                ['app/p/page.tsx'],
                [{ ...PAIR, lazy: 'components/systems/install.ts' }],
                withGate
            )
        ).toEqual([]);
    });
});

describe('system install entries', () => {
    it('every script that reaches a lookup reaches its root', () => {
        const deps = fsDeps();

        const flat: Deps = (file) => ({ ...deps(file), client: false });

        expect(
            unrooted(
                scriptEntries(),
                INSTALL_PAIRS.map((p) => ({ ...p, side: 'server' as const })),
                flat
            ),
            'import the install root in the script'
        ).toEqual([]);
    });

    it('every route and page that reaches a lookup reaches its root', () => {
        const exempt = new Set([
            ...STATIC_SAFE,
            ...CLIENT_LAZY,
            ...LAYOUT_SAFE,
        ]);

        expect(
            unrooted(
                appEntries().filter((e) => !exempt.has(e)),
                INSTALL_PAIRS,
                fsDeps()
            ),
            'add the install root import to the entry (or a file on its path)'
        ).toEqual([]);
    });

    it('the exemptions list only entries that still reach a lookup unrooted', () => {
        const stale = [...STATIC_SAFE, ...CLIENT_LAZY, ...LAYOUT_SAFE].filter(
            (e) => unrooted([e], INSTALL_PAIRS, fsDeps()).length === 0
        );

        expect(stale).toEqual([]);
    });
});
