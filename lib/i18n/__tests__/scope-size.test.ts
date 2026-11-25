import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { LOCALES, type Namespace } from '../config';
import { loadMessages, loadStaticMessages } from '../messages';
import {
    BATTLE_NAMESPACES,
    CAMPAIGN_NAMESPACES,
    ROOT_NAMESPACES,
} from '../scopes';
import { logScope, systemPackScope, systemScope } from '../system-scope';

import { SYSTEM_META } from '@/lib/utils/rules/systems/meta';

const LIMIT_KB = 112.9;

// per-system budgets live in the system meta (i18n.budgetKb); limits keep ~0.5 KB headroom over the measured uk gzip
const ROOT_LIMIT_KB = 20;

const BASE = [...CAMPAIGN_NAMESPACES, ...BATTLE_NAMESPACES];

const systemScopes = SYSTEM_META.filter(
    (meta) => (meta.kind ?? 'base') === 'base'
).flatMap((meta) => {
    const key = meta.keys[0] as string;

    const { budgetKb } = meta.i18n as {
        budgetKb?: {
            packs?: {
                battle?: number;
                characterSheet?: number;
                contentLibrary?: number;
            };
            pages?: Record<string, number>;
        };
    };

    const battle = [
        ...systemPackScope({ key }, 'battle'),
        ...logScope({ key }),
    ];

    const packs = budgetKb?.packs;

    const member = [
        ...BASE,
        ...battle,
        ...systemPackScope({ key }, 'characterSheet'),
    ];

    const addons = SYSTEM_META.filter(
        (m) =>
            m.kind === 'addon' &&
            (m.requires as readonly string[] | undefined)?.includes(meta.module)
    ).map((m) => m.module);

    return [
        {
            name: `${key} battle`,
            namespaces: [
                ...CAMPAIGN_NAMESPACES,
                ...BATTLE_NAMESPACES,
                ...battle,
            ],
            ...(packs?.battle && { limit: packs.battle }),
        },
        {
            name: `${key} battle + modules`,
            namespaces: [
                ...CAMPAIGN_NAMESPACES,
                ...BATTLE_NAMESPACES,
                ...systemPackScope({ key, modules: addons }, 'battle'),
                ...logScope({ key }),
            ],
            ...(packs?.battle && { limit: packs.battle }),
        },
        ...(packs?.characterSheet
            ? [
                  {
                      name: `${key} member`,
                      namespaces: member,
                      limit: packs.characterSheet,
                  },
              ]
            : []),
        ...(packs?.contentLibrary
            ? [
                  {
                      name: `${key} DM`,
                      namespaces: [
                          ...member,
                          ...systemPackScope({ key }, 'contentLibrary'),
                      ],
                      limit: packs.contentLibrary,
                  },
              ]
            : []),
        ...Object.entries(budgetKb?.pages ?? {}).map(([page, limit]) => ({
            name: `${key} ${page} page extra`,
            namespaces: systemScope(
                { key },
                page as Parameters<typeof systemScope>[1]
            ),
            limit,
        })),
    ];
});

const SCOPES = [
    { name: 'campaign', namespaces: CAMPAIGN_NAMESPACES },
    { name: 'campaign + battle', namespaces: BASE },
    ...systemScopes,
] as readonly {
    name: string;
    namespaces: readonly Namespace[];
    limit?: number;
}[];

describe('message scope size', () => {
    it.each(
        SCOPES.flatMap((scope) =>
            LOCALES.map((locale) => ({ ...scope, locale }))
        )
    )(
        '$name $locale stays under the split threshold',
        async ({ name, namespaces, locale, limit }) => {
            const json = JSON.stringify(await loadMessages(locale, namespaces));

            const gzipKb = gzipSync(json, { level: 9 }).length / 1024;

            console.info(
                `${name} scope ${locale}: ${(json.length / 1024).toFixed(1)} KB raw, ${gzipKb.toFixed(1)} KB gzip`
            );

            expect(gzipKb).toBeLessThan(limit ?? LIMIT_KB);
        }
    );

    it('root chunk (root namespaces, both locales) stays under the budget', async () => {
        const json = JSON.stringify(await loadStaticMessages(ROOT_NAMESPACES));

        const gzipKb = gzipSync(json, { level: 9 }).length / 1024;

        console.info(
            `root scope: ${(json.length / 1024).toFixed(1)} KB raw, ${gzipKb.toFixed(1)} KB gzip`
        );

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
