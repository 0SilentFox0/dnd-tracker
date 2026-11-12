import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { contentLayer, invalidateCampaignLayer } from '@/lib/db/content-layer';
import { createScopedDatabase } from '@/lib/server/content/write-context';
import {
    isLocalDevDatabaseEnv,
    singleConnectionDatabaseUrl,
} from '@/lib/server/test-support/local-db';

const raw = new PrismaClient({
    datasources: { db: { url: singleConnectionDatabaseUrl('DATABASE_URL') } },
});

const scoped = createScopedDatabase(raw.$extends(contentLayer()));

vi.mock('@/lib/db', () => ({
    get prisma() {
        return scoped;
    },
}));
vi.mock('@/lib/cache/tags', async (orig) => ({
    ...(await orig<object>()),
    invalidateReference: vi.fn(),
    invalidateAllReference: vi.fn(),
}));

import { catalogOf } from '../lib/i18n-convert';
import { importPack } from '../lib/import-pack';
import { readPack } from '../lib/pack';
import { grimData } from '../systems/wfrp/__tests__/pack-helpers';
import { GRIM_SPELL_LISTS } from '../systems/wfrp/spells';

import { createCampaignForUser } from '@/lib/server/campaigns/create-campaign';
import { exportCampaign } from '@/lib/server/templates/export-campaign';
import { localizeTemplateBundle } from '@/lib/server/templates/localize-template-bundle';
import { visible } from '@/lib/server/templates/sync/__tests__/helpers';
import { classify } from '@/lib/server/templates/sync/classify';
import {
    loadSyncContext,
    type SyncDb,
} from '@/lib/server/templates/sync/context';
import type { TranslationsV2 } from '@/lib/utils/templates/i18n/keys';
import { translateAt } from '@/lib/utils/templates/i18n/overlay';
import { slugify } from '@/lib/utils/templates/slug';
import { readTranslations } from '@/scripts/templates/lib/i18n-store';
import { listRaceProfiles } from '@/systems/wfrp/server/race-profile';

const marker = `grimloc-${randomUUID()}`;

const data = grimData();

const uk = readTranslations('grim-d100', 'uk');

type Rows = { name: string }[];

const names = (rows: Rows) => rows.map((row) => row.name).sort();

const nameOf = (
    tr: TranslationsV2,
    kind: string,
    row: { slug?: unknown; name?: unknown }
) => translateAt(tr, `${kind}/${String(row.slug)}/name`, String(row.name));

const expectedNames = (
    kind: string,
    rows: { slug?: unknown; name?: unknown }[],
    tr: TranslationsV2
) => rows.map((row) => nameOf(tr, kind, row)).sort();

describe.skipIf(!isLocalDevDatabaseEnv())('grim-d100 localized clones', () => {
    let templateId = '';

    let guardPassed = false;

    const userId = marker;

    const clones = {} as Record<'uk' | 'en', string>;

    beforeAll(async () => {
        if (
            await raw.campaign.count({
                where: { kind: 'template', name: 'Grim d100' },
            })
        )
            throw new Error(
                'a Grim d100 template already exists in the test database'
            );

        guardPassed = true;

        await raw.user.create({
            data: {
                id: userId,
                email: `${marker}@example.invalid`,
                displayName: marker,
            },
        });
        vi.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterAll(async () => {
        if (!guardPassed) return void (await raw.$disconnect());

        const ids = (
            await raw.campaign.findMany({
                where: { dmUserId: userId },
                select: { id: true },
            })
        ).map((c) => c.id);

        await raw.campaign.updateMany({
            where: { id: { in: ids } },
            data: { baseSourceId: null },
        });
        await raw.featBase.deleteMany({
            where: { sourceCampaignId: { in: ids } },
        });
        await raw.spellBase.deleteMany({
            where: { sourceCampaignId: { in: ids } },
        });
        await raw.artifactBase.deleteMany({
            where: { sourceCampaignId: { in: ids } },
        });
        await raw.careerBase.deleteMany({
            where: { sourceCampaignId: { in: ids } },
        });
        await raw.raceBase.deleteMany({
            where: { sourceCampaignId: { in: ids } },
        });
        await raw.unitBase.deleteMany({
            where: { sourceCampaignId: { in: ids } },
        });
        await raw.campaign.deleteMany({ where: { id: { in: ids } } });
        await raw.user.deleteMany({ where: { id: userId } });
        await raw.$disconnect();
    });

    it('loads the template and a second run is a no-op', async () => {
        const first = await importPack('grim-d100', {
            owner: userId,
            publish: true,
        });

        templateId = first.templateId as string;
        expect(first.created).toBe(true);

        const second = await importPack('grim-d100', {
            owner: userId,
            publish: true,
        });

        expect(second.published).toMatchObject({
            added: 0,
            changed: 0,
            removed: 0,
        });
    });

    it('every catalog key is applied on the DB row form', async () => {
        const catalog = catalogOf('grim-d100');

        expect(catalog.length).toBeGreaterThan(100);

        const tr: TranslationsV2 = Object.fromEntries(
            catalog.map((entry, index) => [
                entry.key,
                { text: `${entry.en}\u27e6${index}\u27e7`, en: entry.en },
            ])
        );

        const localized = localizeTemplateBundle(
            await exportCampaign(scoped as never, templateId),
            tr
        );

        const applied = new Set(
            [...JSON.stringify(localized).matchAll(/\u27e6(\d+)\u27e7/g)].map(
                (m) => Number(m[1])
            )
        );

        expect(
            catalog
                .filter((_, index) => !applied.has(index))
                .map((entry) => entry.key)
        ).toEqual([]);
    });

    it.each([['uk' as const], ['en' as const]])(
        'clones the %s locale with translated rows',
        async (locale) => {
            const created = await createCampaignForUser(
                userId,
                {
                    name: `${marker}-${locale}`,
                    templateId,
                    contentLocale: locale,
                },
                { defer: () => undefined }
            );

            if (!created.ok) throw new Error('clone failed');

            invalidateCampaignLayer();

            const campaignId = created.campaign.id;

            clones[locale] = campaignId;

            const tr: TranslationsV2 = locale === 'uk' ? uk : {};

            const where = { campaignId };

            const [careers, spells, units, artifacts, feats, races, campaign] =
                await Promise.all([
                    scoped.career.findMany({ where, select: { name: true } }),
                    scoped.spell.findMany({
                        where,
                        select: { name: true, lists: true },
                    }),
                    scoped.unit.findMany({ where, select: { name: true } }),
                    scoped.artifact.findMany({ where, select: { name: true } }),
                    scoped.feat.findMany({ where, select: { name: true } }),
                    scoped.race.findMany({ where, select: { name: true } }),
                    raw.campaign.findUniqueOrThrow({
                        where: { id: campaignId },
                        select: { locale: true, rules: true },
                    }),
                ]);

            expect(campaign.locale).toBe(locale);

            for (const [kind, rows, source] of [
                ['careers', careers, data.careers],
                ['spells', spells, data.spells],
                ['units', units, data.units],
                ['artifacts', artifacts, data.artifacts],
                ['feats', feats, data.feats],
                ['races', races, data.races],
            ] as const) {
                expect(rows).toHaveLength(source.length);
                expect(names(rows)).toEqual(expectedNames(kind, source, tr));
            }

            const minor = (
                campaign.rules as {
                    tables: { miscastMinor: { text: string }[] };
                }
            ).tables.miscastMinor[0].text;

            expect(minor).toBe(
                translateAt(
                    tr,
                    'rules/_/miscastMinor[0].text',
                    (
                        data.rules?.tables as unknown as {
                            miscastMinor: { text: string }[];
                        }
                    ).miscastMinor[0].text
                )
            );

            if (locale === 'uk') {
                const known = new Set(
                    Object.values(GRIM_SPELL_LISTS)
                        .flat()
                        .map((list) =>
                            translateAt(uk, `lists/${slugify(list)}/name`, list)
                        )
                );

                for (const spell of spells)
                    expect(
                        known.has((spell.lists as string[])[0]),
                        spell.name
                    ).toBe(true);
            }
        }
    );

    it('keeps the species profile structure identical across locales', async () => {
        const normalized = async (campaignId: string) => {
            const [careers, feats, races] = await Promise.all([
                scoped.career.findMany({
                    where: { campaignId },
                    select: { id: true, name: true },
                }),
                scoped.feat.findMany({
                    where: { campaignId },
                    select: { id: true, name: true },
                }),
                scoped.race.findMany({
                    where: { campaignId },
                    select: { id: true, name: true },
                }),
            ]);

            const pos = (
                kind: string,
                rows: { id: string; name: string }[],
                source: { slug?: unknown; name?: unknown }[]
            ) => {
                const order = new Map(
                    source.flatMap(
                        (row, index) =>
                            [
                                [String(row.name), index],
                                [nameOf(uk, kind, row), index],
                            ] as const
                    )
                );

                return new Map(
                    rows.map((row) => [row.id, order.get(row.name)])
                );
            };

            const careerPos = pos('careers', careers, data.careers);

            const featPos = pos('feats', feats, data.feats);

            const racePos = pos('races', races, data.races);

            const profiles = await listRaceProfiles(campaignId);

            return profiles
                .map(({ raceId, profile }) => ({
                    race: racePos.get(raceId),
                    careerTable: profile.careerTable.map((r) => ({
                        max: r.max,
                        career: careerPos.get(r.careerId),
                    })),
                    talents: profile.talents.map((id) => featPos.get(id)),
                    randomTalents: profile.randomTalents.map((r) =>
                        featPos.get(r.featId)
                    ),
                }))
                .sort((a, b) => Number(a.race) - Number(b.race));
        };

        expect(await normalized(clones.uk)).toEqual(
            await normalized(clones.en)
        );
    });

    it('clones are in sync with the template', async () => {
        for (const locale of ['uk', 'en'] as const)
            expect(
                visible(
                    classify(
                        await loadSyncContext(
                            scoped as unknown as SyncDb,
                            clones[locale]
                        )
                    )
                ),
                locale
            ).toEqual([]);
    });
});

describe.skipIf(!isLocalDevDatabaseEnv())(
    'heroes-homm localized clone (English base, uk overlay)',
    () => {
        const heroesMarker = `heroesloc-${randomUUID()}`;

        let tmpDir = '';

        const key = `heroes-loc-${heroesMarker.slice(-8)}`;

        let heroesUk: TranslationsV2 = {};

        let templateId = '';

        beforeAll(async () => {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heroes-loc-'));
            heroesUk = readTranslations('heroes-homm', 'uk');
            vi.spyOn(console, 'info').mockImplementation(() => undefined);
            await raw.user.create({
                data: {
                    id: heroesMarker,
                    email: `${heroesMarker}@example.invalid`,
                    displayName: heroesMarker,
                },
            });

            const pack = readPack('heroes-homm');

            fs.cpSync(
                path.join(process.cwd(), 'data/templates/heroes-homm'),
                path.join(tmpDir, key),
                { recursive: true }
            );
            fs.writeFileSync(
                path.join(tmpDir, key, 'manifest.json'),
                JSON.stringify({
                    ...pack.manifest,
                    key,
                    names: { en: key, uk: key },
                })
            );
            templateId = (
                await importPack(key, { owner: heroesMarker, dir: tmpDir })
            ).templateId as string;
        });

        afterAll(async () => {
            const ids = (
                await raw.campaign.findMany({
                    where: { dmUserId: heroesMarker },
                    select: { id: true },
                })
            ).map((c) => c.id);

            await raw.campaign.updateMany({
                where: { id: { in: ids } },
                data: { baseSourceId: null },
            });
            await raw.campaign.deleteMany({ where: { id: { in: ids } } });
            await raw.user.deleteMany({ where: { id: heroesMarker } });

            if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        it('every catalog key of the English pack is applied on the DB row form', async () => {
            const catalog = catalogOf('heroes-homm');

            expect(catalog.length).toBeGreaterThan(1000);

            const tr: TranslationsV2 = Object.fromEntries(
                catalog.map((entry, index) => [
                    entry.key,
                    { text: `${entry.en}\u27e6${index}\u27e7`, en: entry.en },
                ])
            );

            const applied = new Set(
                [
                    ...JSON.stringify(
                        localizeTemplateBundle(
                            await exportCampaign(scoped as never, templateId),
                            tr
                        )
                    ).matchAll(/\u27e6(\d+)\u27e7/g),
                ].map((m) => Number(m[1]))
            );

            expect(
                catalog
                    .filter((_, index) => !applied.has(index))
                    .map((entry) => entry.key)
            ).toEqual([]);
        });

        it('the uk overlay renames rows, the English template stays Cyrillic-free', async () => {
            const bundle = await exportCampaign(scoped as never, templateId);

            expect(JSON.stringify(bundle)).not.toMatch(/[\u0400-\u04FF]/);

            const localized = localizeTemplateBundle(bundle, heroesUk);

            const pack = readPack('heroes-homm');

            expect(names(localized.units as unknown as Rows)).toEqual(
                expectedNames('units', pack.rows.units ?? [], heroesUk)
            );
            expect(names(localized.races as unknown as Rows)).toEqual(
                expectedNames('races', pack.rows.races ?? [], heroesUk)
            );
            expect(names(localized.artifacts as unknown as Rows)).toEqual(
                expectedNames('artifacts', pack.rows.artifacts ?? [], heroesUk)
            );
        });

        it('string references the engine matches by name resolve to localized rows (D30)', async () => {
            const localized = localizeTemplateBundle(
                await exportCampaign(scoped as never, templateId),
                heroesUk
            ) as unknown as Record<string, Array<Record<string, any>>>;

            const raceNames = new Set(localized.races.map((row) => row.name));

            const mainSkillNames = new Set(
                localized.mainSkills.map((row) => row.name)
            );

            expect(localized.skillTrees.length).toBeGreaterThan(0);

            const missing: string[] = [];

            const need = (set: Set<unknown>, value: unknown, where: string) =>
                void (
                    set.has(value) || missing.push(`${where}: ${String(value)}`)
                );

            for (const tree of localized.skillTrees) {
                need(raceNames, tree.race, `skillTrees ${tree.slug}`);

                for (const main of tree.skills?.mainSkills ?? [])
                    need(
                        mainSkillNames,
                        main.name,
                        `skillTrees ${tree.slug} mainSkills`
                    );
            }

            const walk = (value: unknown, where: string): void => {
                if (Array.isArray(value))
                    return value.forEach((item) => walk(item, where));

                if (!value || typeof value !== 'object') return;

                const node = value as Record<string, unknown>;

                if (node.type === 'targetRace' && Array.isArray(node.races))
                    for (const race of node.races)
                        need(raceNames, race, `${where} targetRace`);

                if (node.kind === 'summon' && typeof node.group === 'string')
                    need(raceNames, node.group, `${where} summon`);

                for (const child of Object.values(node)) walk(child, where);
            };

            for (const table of ['units', 'skills', 'spells', 'artifacts'])
                for (const row of localized[table] ?? [])
                    walk(row, `${table} ${row.slug}`);

            expect(missing).toEqual([]);
        });
    }
);
