import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { type Locale, LOCALES, type Namespace } from '../config';
import { loadMessages, loadStaticMessages, trimWhatsNew } from '../messages';
import {
    CAMPAIGN_BASE,
    CAMPAIGN_BASE_LIMIT_KB,
    ROUTE_SCOPES,
    type RouteKey,
    routeNamespaces,
} from '../route-scopes';
import { ROOT_NAMESPACES } from '../scopes';
import { logScope, systemPackScope, systemScope } from '../system-scope';
import { ROUTE_BUDGETS_KB } from '../test/route-budgets';
import { campaignPages, routeGraph } from '../test/route-namespaces';

import { SYSTEM_META, type SystemMeta } from '@/lib/utils/rules/systems/meta';

// limits are the measured uk gzip + ~0.5 KB headroom, rounded up to 0.1
const ROOT_LIMIT_KB = 20;

const gzipKbOf = async (locale: Locale, namespaces: readonly Namespace[]) => {
    const messages = trimWhatsNew(await loadMessages(locale, namespaces));

    return gzipSync(JSON.stringify(messages), { level: 9 }).length / 1024;
};

const routeScopeOf = (declared: readonly string[]) => {
    const keys = declared as RouteKey[];

    return [
        ...new Set<Namespace>([
            ...CAMPAIGN_BASE,
            'whatsNew',
            ...keys.flatMap((key) => routeNamespaces(key, null)),
        ]),
    ];
};

const ROUTES = new Map<string, { namespaces: readonly Namespace[]; pages: string[] }>();

for (const page of campaignPages()) {
    const { declaredRoutes } = routeGraph(page);

    const key = declaredRoutes.at(-1);

    if (!key) continue;

    const namespaces = routeScopeOf(declaredRoutes);

    const hit = ROUTES.get(key);

    ROUTES.set(key, {
        namespaces: [...new Set([...(hit?.namespaces ?? []), ...namespaces])],
        pages: [...(hit?.pages ?? []), page],
    });
}

const systemScopes = SYSTEM_META.filter(
    (meta) => (meta.kind ?? 'base') === 'base'
).flatMap((meta) => {
    const key = meta.keys[0] as string;

    const budgetKb = (meta as SystemMeta).i18n.budgetKb;

    return Object.entries(budgetKb?.packs ?? {}).map(([pack, limit]) => ({
        name: `${key} pack ${pack}`,
        namespaces: [
            ...systemPackScope({ key }, pack as Parameters<typeof systemPackScope>[1]),
            ...(pack === 'battle' ? logScope({ key }) : []),
        ] as readonly Namespace[],
        limit,
    })).concat(
        Object.entries(budgetKb?.pages ?? {}).map(([page, limit]) => ({
            name: `${key} ${page} page extra`,
            namespaces: systemScope(
                { key },
                page as Parameters<typeof systemScope>[1]
            ) as readonly Namespace[],
            limit,
        }))
    );
});

const SCOPES = [
    {
        name: 'campaign base',
        namespaces: CAMPAIGN_BASE as readonly Namespace[],
        limit: CAMPAIGN_BASE_LIMIT_KB,
    },
    ...[...ROUTES.entries()].map(([route, { namespaces }]) => ({
        name: `route ${route}`,
        namespaces,
        limit: ROUTE_BUDGETS_KB[route as RouteKey],
    })),
    ...systemScopes,
];

describe('message scope size', () => {
    it.each(
        SCOPES.flatMap((scope) =>
            LOCALES.map((locale) => ({ ...scope, locale }))
        )
    )(
        '$name $locale stays under its budget',
        async ({ name, namespaces, locale, limit }) => {
            const gzipKb = await gzipKbOf(locale, namespaces);

            console.info(`${name} ${locale}: ${gzipKb.toFixed(1)} KB gzip`);

            expect(limit, `${name} has no budget`).toBeDefined();
            expect(gzipKb).toBeLessThan(limit as number);
        }
    );

    it('every route key has a budget and every budget a route', () => {
        expect(Object.keys(ROUTE_BUDGETS_KB).sort()).toEqual(
            [...ROUTES.keys()].sort()
        );

        for (const key of ROUTES.keys())
            expect(ROUTE_SCOPES).toHaveProperty([key]);
    });

    it('root chunk (root namespaces, both locales) stays under the budget', async () => {
        const json = JSON.stringify(await loadStaticMessages(ROOT_NAMESPACES));

        const gzipKb = gzipSync(json, { level: 9 }).length / 1024;

        console.info(`root scope: ${gzipKb.toFixed(1)} KB gzip`);

        expect(gzipKb).toBeLessThan(ROOT_LIMIT_KB);
    });

    it('a d20 campaign gets only the namespaces of its modules', () => {
        for (const slot of [
            'character',
            'dmCharacters',
            'dmCharacter',
            'dmRules',
            'draft',
        ] as const) {
            expect(systemScope({ key: 'homm', modules: [] }, slot)).toEqual([]);
            expect(systemScope({ key: 'dnd5e' }, slot)).toEqual([]);
            expect(systemScope(null, slot)).toEqual([]);
        }

        expect(
            systemPackScope({ key: 'homm', modules: [] }, 'battle')
        ).toContain('battleD20');
        expect(systemPackScope({ key: 'dnd5e' }, 'characterSheet')).toEqual([
            'inspiration',
        ]);
    });
});
