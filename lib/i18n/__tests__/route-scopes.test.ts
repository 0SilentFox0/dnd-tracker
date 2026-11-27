import { describe, expect, it } from 'vitest';

import {
    CAMPAIGN_BASE,
    ROUTE_SCOPES,
    type RouteKey,
    routeNamespaces,
} from '../route-scopes';
import { ROOT_NAMESPACES } from '../scopes';
import { rulesFormScope } from '../system-scope';
import {
    campaignPages,
    collectUses,
    reach,
    routeGraph,
} from '../test/route-namespaces';
import { isExempt } from '../test/route-scope-allow';
import { ENTRIES, systemReads } from '../test/system-reads';

import {
    SYSTEM_META,
    type SystemMeta,
} from '@/lib/utils/rules/systems/meta';

const PAGES = campaignPages();

const METAS = SYSTEM_META as readonly SystemMeta[];

const SYSTEM_NAMESPACES = new Set<string>(
    METAS.flatMap((meta) => [
        ...Object.values(meta.i18n.packs ?? {}).flat(),
        ...Object.values(meta.i18n.pages ?? {}).flat(),
        ...(meta.i18n.rules ?? []),
        ...(meta.i18n.log ?? []),
    ])
);

const ALWAYS = new Set<string>([
    ...CAMPAIGN_BASE,
    ...ROOT_NAMESPACES,
    'whatsNew',
    'demoTours',
    ...SYSTEM_NAMESPACES,
]);

const RULES_FORM = new Set<string>(rulesFormScope());

/** Pages whose scope is the campaign base only; each needs a reason. */
const ROUTE_SCOPE_BASE_ONLY: { page: string; reason: string }[] = [
    {
        page: 'app/campaigns/[id]/dm/page.tsx',
        reason: 'redirects to the dashboard, renders nothing',
    },
    {
        page: 'app/campaigns/[id]/dm/npc-heroes/page.tsx',
        reason: 'redirects to the characters list, renders nothing',
    },
];

const PACK =
    'pack granularity: the pack is shared by several routes and this one reads only part of it';

/** Namespaces in a route scope that no page graph or system slot reads, each with the reason it stays. */
const ROUTE_SCOPE_UNUSED_ALLOWED: {
    route: RouteKey;
    ns: string[];
    reason: string;
}[] = [
    {
        route: '[id]/info',
        ns: ['campaigns', 'characters', 'characterProfile', 'rest', 'races', 'feats', 'backgrounds', 'choices'],
        reason: PACK,
    },
    {
        route: '[id]/character/draft',
        ns: ['rest', 'races', 'skills', 'artifacts', 'spells', 'spellEditor', 'contentImport', 'contentCopy'],
        reason: PACK,
    },
    {
        route: '[id]/character/new',
        ns: ['rest', 'races', 'skills', 'artifacts', 'spells', 'spellEditor', 'contentImport', 'contentCopy'],
        reason: PACK,
    },
    {
        route: '[id]/character/edit',
        ns: ['characters', 'characterProfile', 'rest', 'races', 'classes', 'feats', 'backgrounds', 'skills', 'artifacts', 'choices', 'spells', 'spellEditor', 'compendium', 'contentImport', 'contentCopy'],
        reason: PACK,
    },
    {
        route: '[id]/battles',
        ns: ['characters', 'rest', 'races', 'classes', 'feats', 'backgrounds', 'skills', 'choices'],
        reason: PACK,
    },
    {
        route: '[id]/journal',
        ns: ['scenarioGraph', 'show', 'acquaintances', 'music', 'maps', 'tileLabels', 'rest', 'contentCopy'],
        reason: PACK,
    },
    {
        route: '[id]/world',
        ns: ['scenario', 'scenarioGraph', 'show', 'acquaintances', 'music', 'maps', 'tileLabels', 'quests', 'rest', 'contentCopy'],
        reason: PACK,
    },
    {
        route: '[id]/show',
        ns: ['scenario', 'scenarioGraph', 'acquaintances', 'maps', 'tileLabels', 'quests', 'contentCopy'],
        reason: PACK,
    },
    {
        route: '[id]/acquaintances',
        ns: ['scenario', 'scenarioGraph', 'show', 'world', 'music', 'maps', 'tileLabels', 'quests', 'rest', 'contentCopy'],
        reason: PACK,
    },
    {
        route: '[id]/dm/spells',
        ns: ['races', 'feats', 'backgrounds', 'skills', 'artifacts'],
        reason: PACK,
    },
    {
        route: '[id]/dm/spells/[spellId]',
        ns: ['characterProfile', 'rest', 'races', 'feats', 'backgrounds', 'skills', 'artifacts'],
        reason: PACK,
    },
    {
        route: '[id]/dm/spells/new',
        ns: ['characterProfile', 'rest', 'races', 'feats', 'backgrounds', 'skills', 'artifacts'],
        reason: PACK,
    },
    {
        route: '[id]/dm/spell-groups',
        ns: ['races', 'classes', 'feats', 'backgrounds', 'skills', 'artifacts', 'choices', 'abilityRegistry', 'abilityText', 'battleTerms', 'battleCommon'],
        reason: PACK,
    },
    {
        route: '[id]/dm/races',
        ns: ['backgrounds', 'artifacts', 'editors', 'characterProfile', 'rest'],
        reason: PACK,
    },
    {
        route: '[id]/dm/races/[raceId]',
        ns: ['editors', 'characterProfile', 'rest', 'backgrounds', 'artifacts'],
        reason: PACK,
    },
    {
        route: '[id]/dm/classes',
        ns: ['characterProfile', 'rest', 'races', 'backgrounds', 'skills', 'artifacts', 'editors'],
        reason: PACK,
    },
    {
        route: '[id]/dm/classes/[classId]',
        ns: ['races', 'backgrounds', 'skills', 'artifacts', 'editors', 'characterProfile', 'rest'],
        reason: PACK,
    },
    {
        route: '[id]/dm/feats',
        ns: ['races', 'backgrounds', 'skills', 'artifacts'],
        reason: PACK,
    },
    {
        route: '[id]/dm/feats/[featId]',
        ns: ['editors', 'characterProfile', 'rest', 'races', 'backgrounds', 'skills', 'artifacts'],
        reason: PACK,
    },
    {
        route: '[id]/dm/backgrounds',
        ns: ['characterProfile', 'rest', 'races', 'skills', 'artifacts', 'editors'],
        reason: PACK,
    },
    {
        route: '[id]/dm/backgrounds/[backgroundId]',
        ns: ['races', 'skills', 'artifacts', 'editors', 'characterProfile', 'rest'],
        reason: PACK,
    },
    {
        route: '[id]/dm/artifacts',
        ns: ['races', 'feats', 'backgrounds', 'skills', 'choices'],
        reason: PACK,
    },
    {
        route: '[id]/dm/artifacts/[artifactId]',
        ns: ['editors', 'races', 'feats', 'backgrounds', 'skills', 'choices'],
        reason: PACK,
    },
    {
        route: '[id]/dm/artifacts/new',
        ns: ['editors', 'races', 'feats', 'backgrounds', 'skills', 'choices'],
        reason: PACK,
    },
    {
        route: '[id]/dm/skills',
        ns: ['characterProfile', 'rest', 'races', 'feats', 'backgrounds', 'artifacts', 'choices', 'editors'],
        reason: PACK,
    },
    {
        route: '[id]/dm/skills/[skillId]',
        ns: ['editors', 'characterProfile', 'rest', 'races', 'feats', 'backgrounds', 'artifacts', 'choices'],
        reason: PACK,
    },
    {
        route: '[id]/dm/skills/new',
        ns: ['editors', 'characterProfile', 'rest', 'races', 'feats', 'backgrounds', 'artifacts', 'choices'],
        reason: PACK,
    },
    {
        route: '[id]/dm/main-skills',
        ns: ['characters', 'characterProfile', 'rest', 'races', 'classes', 'feats', 'backgrounds', 'artifacts', 'choices', 'spells', 'abilityRegistry', 'abilityText', 'battleTerms', 'battleCommon'],
        reason: PACK,
    },
    {
        route: '[id]/dm/main-skills/[mainSkillId]',
        ns: ['abilityRegistry', 'abilityText', 'battleTerms', 'battleCommon', 'abilityEditor', 'editors', 'characters', 'characterProfile', 'rest', 'races', 'classes', 'feats', 'backgrounds', 'artifacts', 'choices', 'spells'],
        reason: PACK,
    },
    {
        route: '[id]/dm/compendium',
        ns: ['spells', 'races', 'classes', 'feats', 'backgrounds', 'skills', 'artifacts', 'choices', 'contentImport', 'contentCopy', 'abilityRegistry', 'abilityText', 'battleTerms', 'battleCommon'],
        reason: PACK,
    },
    {
        route: '[id]/dm/characters',
        ns: ['contentImport', 'contentCopy'],
        reason: PACK,
    },
    {
        route: '[id]/dm/characters/[characterId]',
        ns: ['contentImport', 'contentCopy'],
        reason: PACK,
    },
    {
        route: '[id]/dm/units',
        ns: ['races', 'feats', 'backgrounds', 'skills', 'artifacts', 'choices'],
        reason: PACK,
    },
    {
        route: '[id]/dm/units/new',
        ns: ['editors', 'rest', 'races', 'feats', 'backgrounds', 'skills', 'artifacts', 'choices'],
        reason: PACK,
    },
    {
        route: '[id]/dm/units/[unitId]',
        ns: ['editors', 'rest', 'races', 'feats', 'backgrounds', 'skills', 'artifacts', 'choices'],
        reason: PACK,
    },
    {
        route: '[id]/dm/battles',
        ns: ['music'],
        reason: PACK,
    },
    {
        route: '[id]/dm/maps',
        ns: ['scenario', 'scenarioGraph', 'show', 'acquaintances', 'world', 'music', 'quests', 'rest'],
        reason: PACK,
    },
    {
        route: '[id]/dm/maps/[mapId]',
        ns: ['scenario', 'scenarioGraph', 'show', 'acquaintances', 'world', 'music', 'quests', 'rest', 'contentCopy'],
        reason: PACK,
    },
    {
        route: '[id]/dm/scenario',
        ns: ['scenarioGraph', 'maps', 'tileLabels', 'quests', 'contentCopy', 'campaigns'],
        reason: PACK,
    },
    {
        route: '[id]/dm/graph',
        ns: ['show', 'acquaintances', 'world', 'music', 'maps', 'tileLabels', 'quests', 'rest', 'contentCopy', 'campaigns'],
        reason: PACK,
    },
    {
        route: '[id]/dm/show',
        ns: ['scenario', 'scenarioGraph', 'acquaintances', 'maps', 'tileLabels', 'quests', 'rest', 'contentCopy'],
        reason: PACK,
    },
    {
        route: '[id]/dm/world',
        ns: ['scenarioGraph', 'show', 'acquaintances', 'music', 'maps', 'tileLabels', 'quests', 'contentCopy'],
        reason: PACK,
    },
    {
        route: '[id]/dm/music',
        ns: ['scenario', 'scenarioGraph', 'show', 'acquaintances', 'world', 'maps', 'tileLabels', 'quests', 'rest'],
        reason: PACK,
    },
    {
        route: '[id]/dm/ai',
        ns: ['scenario'],
        reason: PACK,
    },
    {
        route: '[id]/dm/print',
        ns: ['characters', 'characterProfile', 'rest', 'races', 'classes', 'feats', 'backgrounds', 'artifacts', 'choices', 'abilityEditor', 'editors', 'contentImport', 'contentCopy'],
        reason: PACK,
    },
    {
        route: '[id]/dm/system',
        ns: ['characterProfile', 'rest', 'races', 'editors'],
        reason: PACK,
    },
];

const scopeOf = (routes: readonly string[]) =>
    new Set<string>([
        ...ALWAYS,
        ...routes.flatMap((r) => routeNamespaces(r as RouteKey, null)),
    ]);

describe('campaign route scopes', () => {
    it.each(PAGES)('%s declares its scope', (page) => {
        const g = routeGraph(page);

        expect(g.usesBase).toBe(true);

        for (const r of g.declaredRoutes)
            expect(Object.keys(ROUTE_SCOPES), `${page}: ${r}`).toContain(r);

        const baseOnly = ROUTE_SCOPE_BASE_ONLY.some((e) => e.page === page);

        expect(
            g.declaredRoutes.length > 0 || baseOnly,
            `${page} has no RouteScope in its layout chain`
        ).toBe(true);
    });

    it.each(PAGES)('%s reads only namespaces in its scope', (page) => {
        const g = routeGraph(page);

        const scope = scopeOf(g.declaredRoutes);

        const bad = g.uses.filter(
            (u) =>
                !scope.has(u.ns) &&
                (u.kind === 'hook' ||
                    u.kind === 'server' ||
                    !isExempt(u.file, page))
        );

        expect(
            bad.map((u) => `${u.ns} (${u.kind}) in ${u.file}`),
            `${page} scope: ${g.declaredRoutes.join(', ')}`
        ).toEqual([]);
    });

    const graphs = PAGES.map((page) => routeGraph(page));

    const readsOf = (route: string) =>
        new Set<string>([
            ...graphs
                .filter((g) => g.declaredRoutes.includes(route))
                .flatMap((g) => g.uses.map((u) => u.ns)),
            ...graphs
                .filter((g) => g.declaredRoutes.includes(route))
                .flatMap((g) =>
                    ENTRIES.flatMap(({ moduleIds }) =>
                        systemReads(g.page, moduleIds).map((u) => u.ns)
                    )
                ),
        ]);

    it.each(Object.keys(ROUTE_SCOPES))(
        '%s has no unused namespaces',
        (route) => {
            const declaring = graphs.filter((g) =>
                g.declaredRoutes.includes(route)
            );

            const read = readsOf(route);

            const allowed = new Set(
                ROUTE_SCOPE_UNUSED_ALLOWED.filter(
                    (e) => e.route === route
                ).flatMap((e) => e.ns)
            );

            const unused = routeNamespaces(route as RouteKey, null).filter(
                (ns) => !read.has(ns) && !allowed.has(ns) && !RULES_FORM.has(ns)
            );

            expect(declaring.length, `no page declares ${route}`).toBeGreaterThan(0);
            expect(unused, route).toEqual([]);
        }
    );

    it('the unused allowlist has no stale entries', () => {
        const stale = ROUTE_SCOPE_UNUSED_ALLOWED.flatMap((e) => {
            const read = readsOf(e.route);

            const scope = new Set<string>(routeNamespaces(e.route, null));

            return e.ns
                .filter((ns) => read.has(ns) || !scope.has(ns))
                .map((ns) => `${e.route}: ${ns}`);
        });

        expect(stale).toEqual([]);
    }, 30_000);

    it('the campaign shell reads only the base namespaces', () => {
        const files = [
            ...reach(
                [
                    'app/campaigns/[id]/layout.tsx',
                    'app/campaigns/[id]/campaign-game-shell.tsx',
                    'components/layout/GameShell.tsx',
                ],
                true
            ),
        ]
            .filter(([, modes]) => modes.has('client'))
            .map(([file]) => file);

        const allowed = new Set<string>([
            ...CAMPAIGN_BASE,
            ...ROOT_NAMESPACES,
            'whatsNew',
            'demoTours',
        ]);

        expect(
            collectUses(files)
                .filter((u) => !allowed.has(u.ns))
                .map((u) => `${u.ns} (${u.kind}) in ${u.file}`)
        ).toEqual([]);
    });
});
