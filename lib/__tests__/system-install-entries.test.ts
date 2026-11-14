import { describe, expect, it } from 'vitest';

import {
    appEntries,
    type Deps,
    fsDeps,
    INSTALL_PAIRS,
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
    'app/settings/ai/page.tsx',
    'app/settings/password/page.tsx',
    'app/settings/preferences/page.tsx',
    'app/uk/page.tsx',
];

// client-lazy: root arrives with loadSystems/SystemGate (package C); remove as pages migrate
const CLIENT_LAZY = [
    'app/campaigns/[id]/acquaintances/page.tsx',
    'app/campaigns/[id]/character/draft/page.tsx',
    'app/campaigns/[id]/character/new/page.tsx',
    'app/campaigns/[id]/dm/ai/page.tsx',
    'app/campaigns/[id]/dm/artifact-sets/[setId]/page.tsx',
    'app/campaigns/[id]/dm/artifact-sets/new/page.tsx',
    'app/campaigns/[id]/dm/artifact-sets/page.tsx',
    'app/campaigns/[id]/dm/artifacts/[artifactId]/page.tsx',
    'app/campaigns/[id]/dm/artifacts/new/page.tsx',
    'app/campaigns/[id]/dm/artifacts/page.tsx',
    'app/campaigns/[id]/dm/assistant/page.tsx',
    'app/campaigns/[id]/dm/backgrounds/[backgroundId]/page.tsx',
    'app/campaigns/[id]/dm/backgrounds/page.tsx',
    'app/campaigns/[id]/dm/battles/[battleId]/page.tsx',
    'app/campaigns/[id]/dm/battles/new/page.tsx',
    'app/campaigns/[id]/dm/battles/page.tsx',
    'app/campaigns/[id]/dm/characters/new/page.tsx',
    'app/campaigns/[id]/dm/characters/page.tsx',
    'app/campaigns/[id]/dm/classes/[classId]/page.tsx',
    'app/campaigns/[id]/dm/classes/page.tsx',
    'app/campaigns/[id]/dm/compendium/page.tsx',
    'app/campaigns/[id]/dm/feats/[featId]/page.tsx',
    'app/campaigns/[id]/dm/feats/page.tsx',
    'app/campaigns/[id]/dm/graph/page.tsx',
    'app/campaigns/[id]/dm/main-skills/[mainSkillId]/page.tsx',
    'app/campaigns/[id]/dm/main-skills/page.tsx',
    'app/campaigns/[id]/dm/music/page.tsx',
    'app/campaigns/[id]/dm/print/skills/page.tsx',
    'app/campaigns/[id]/dm/print/spells/page.tsx',
    'app/campaigns/[id]/dm/races/[raceId]/page.tsx',
    'app/campaigns/[id]/dm/races/page.tsx',
    'app/campaigns/[id]/dm/rules/page.tsx',
    'app/campaigns/[id]/dm/scenario/[pageId]/page.tsx',
    'app/campaigns/[id]/dm/scenario/page.tsx',
    'app/campaigns/[id]/dm/show/[deckId]/page.tsx',
    'app/campaigns/[id]/dm/show/[deckId]/preview/page.tsx',
    'app/campaigns/[id]/dm/show/page.tsx',
    'app/campaigns/[id]/dm/skill-trees/page.tsx',
    'app/campaigns/[id]/dm/skills/[skillId]/page.tsx',
    'app/campaigns/[id]/dm/skills/new/page.tsx',
    'app/campaigns/[id]/dm/skills/page.tsx',
    'app/campaigns/[id]/dm/spell-groups/page.tsx',
    'app/campaigns/[id]/dm/spells/[spellId]/page.tsx',
    'app/campaigns/[id]/dm/spells/new/page.tsx',
    'app/campaigns/[id]/dm/system/[section]/page.tsx',
    'app/campaigns/[id]/dm/units/[unitId]/page.tsx',
    'app/campaigns/[id]/dm/units/new/page.tsx',
    'app/campaigns/[id]/dm/units/page.tsx',
    'app/campaigns/[id]/dm/world/page.tsx',
    'app/campaigns/[id]/info/page.tsx',
    'app/campaigns/[id]/page.tsx',
    'app/campaigns/[id]/show/page.tsx',
    'app/campaigns/[id]/world/page.tsx',
];

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
        const exempt = new Set([...STATIC_SAFE, ...CLIENT_LAZY]);

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
        const stale = [...STATIC_SAFE, ...CLIENT_LAZY].filter(
            (e) => unrooted([e], INSTALL_PAIRS, fsDeps()).length === 0
        );

        expect(stale).toEqual([]);
    });
});
