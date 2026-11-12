import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { contentLayer } from '@/lib/db/content-layer';
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

import { catalogOfPack } from '../lib/i18n-convert';
import { writeTranslations } from '../lib/i18n-store';
import { importPack, publishPack } from '../lib/import-pack';
import { readPack } from '../lib/pack';

const marker = `fixpack-${randomUUID()}`;

const fixtures = path.join(__dirname, 'fixtures');

const tmpDirs: string[] = [];

const copyRoot = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fixture-pack-'));

    tmpDirs.push(dir);
    fs.cpSync(
        path.join(fixtures, 'fixture-pack'),
        path.join(dir, 'fixture-pack'),
        { recursive: true }
    );

    return dir;
};

const complete = (dir: string) => {
    const pack = readPack('fixture-pack', dir);

    writeTranslations(
        'fixture-pack',
        'uk',
        Object.fromEntries(
            catalogOfPack(pack).map((entry) => [
                entry.key,
                { text: `т ${entry.en}`, en: entry.en },
            ])
        ),
        dir
    );
};

describe.skipIf(!isLocalDevDatabaseEnv())(
    'template pack import (fixture pack)',
    () => {
        let guardPassed = false;

        let templateId = '';

        beforeAll(async () => {
            if (
                await raw.campaign.count({
                    where: { kind: 'template', templateKey: 'fixture-pack' },
                })
            )
                throw new Error(
                    'a fixture-pack template already exists in the test database'
                );

            guardPassed = true;

            await raw.user.create({
                data: {
                    id: marker,
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
                    where: { dmUserId: marker },
                    select: { id: true },
                })
            ).map((c) => c.id);

            await raw.campaign.updateMany({
                where: { id: { in: ids } },
                data: { baseSourceId: null },
            });

            for (const base of [
                'featBase',
                'spellBase',
                'spellGroupBase',
            ] as const)
                await (
                    raw[base] as unknown as {
                        deleteMany(args: unknown): Promise<unknown>;
                    }
                ).deleteMany({ where: { sourceCampaignId: { in: ids } } });

            await raw.campaign.deleteMany({ where: { id: { in: ids } } });
            await raw.user.deleteMany({ where: { id: marker } });
            for (const dir of tmpDirs)
                fs.rmSync(dir, { recursive: true, force: true });
            await raw.$disconnect();
        });

        it('creates the template with the manifest key and imports every kind', async () => {
            const result = await importPack('fixture-pack', {
                owner: marker,
                dir: fixtures,
            });

            templateId = result.templateId as string;

            expect(result.created).toBe(true);
            expect(result.perKind).toEqual({
                'spell-groups': {
                    created: 2,
                    updated: 0,
                    skipped: 0,
                    errors: 0,
                    deleted: 0,
                },
                spells: {
                    created: 2,
                    updated: 0,
                    skipped: 0,
                    errors: 0,
                    deleted: 0,
                },
                feats: {
                    created: 2,
                    updated: 0,
                    skipped: 0,
                    errors: 0,
                    deleted: 0,
                },
            });
            expect(
                (
                    await raw.campaign.findUniqueOrThrow({
                        where: { id: templateId },
                    })
                ).templateKey
            ).toBe('fixture-pack');
            expect(
                await raw.feat.findMany({
                    where: { campaignId: templateId },
                    select: { icon: true, slug: true },
                    orderBy: { slug: 'asc' },
                })
            ).toEqual([
                {
                    slug: 'fix-alert',
                    icon: 'https://example.test/icons/alert.webp',
                },
                { slug: 'fix-archery', icon: null },
            ]);
        });

        it('a rerun creates nothing and a dry run reports without writing', async () => {
            const again = await importPack('fixture-pack', {
                owner: marker,
                dir: fixtures,
            });

            expect(again).toMatchObject({ templateId, created: false });
            expect(
                Object.values(again.perKind).every(
                    (c) => c.created === 0 && c.errors === 0
                )
            ).toBe(true);

            const version = (
                await raw.campaign.findUniqueOrThrow({
                    where: { id: templateId },
                })
            ).contentVersion;

            const dry = await importPack('fixture-pack', {
                dir: fixtures,
                dryRun: true,
            });

            expect(dry.templateId).toBe(templateId);
            expect(
                Object.values(dry.perKind).every((c) => c.created === 0)
            ).toBe(true);
            expect(
                (
                    await raw.campaign.findUniqueOrThrow({
                        where: { id: templateId },
                    })
                ).contentVersion
            ).toBe(version);
        });

        it('renaming a row in the pack updates it by slug instead of adding a duplicate (Review Focus 1)', async () => {
            const dir = copyRoot();

            const file = path.join(dir, 'fixture-pack', 'feats.json');

            const feats = JSON.parse(fs.readFileSync(file, 'utf8')) as {
                slug: string;
                name: string;
            }[];

            feats[0].name = 'Alertness';
            fs.writeFileSync(file, JSON.stringify(feats));

            const result = await importPack('fixture-pack', {
                owner: marker,
                dir,
            });

            expect(result.perKind.feats).toMatchObject({
                created: 0,
                errors: 0,
            });
            expect(
                (
                    await raw.feat.findMany({
                        where: { campaignId: templateId },
                        select: { name: true, slug: true },
                        orderBy: { slug: 'asc' },
                    })
                ).map((f) => [f.slug, f.name])
            ).toEqual([
                ['fix-alert', 'Alertness'],
                ['fix-archery', 'Archery'],
            ]);
        });

        it('publish refuses while translations are missing or stale and passes when complete (Review Focus 4)', async () => {
            await expect(
                publishPack('fixture-pack', { dir: fixtures })
            ).rejects.toThrow(
                /translations are incomplete \(uk: stale 0, missing \d+\)/
            );

            const dir = copyRoot();

            complete(dir);

            const published = await publishPack('fixture-pack', { dir });

            expect(published.contentVersion).toBeGreaterThan(0);

            const file = path.join(dir, 'fixture-pack', 'i18n', 'uk.json');

            const tr = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<
                string,
                { text: string; en: string }
            >;

            const [first] = Object.keys(tr);

            tr[first].en = `${tr[first].en} (older wording)`;
            fs.writeFileSync(file, JSON.stringify(tr));

            await expect(publishPack('fixture-pack', { dir })).rejects.toThrow(
                /stale 1, missing 0/
            );
            await expect(
                publishPack('fixture-pack', { dir, allowUntranslated: true })
            ).resolves.toBeDefined();
        });

        it('import --publish refuses to publish an incomplete translation but keeps the imported rows', async () => {
            await expect(
                importPack('fixture-pack', {
                    owner: marker,
                    dir: fixtures,
                    publish: true,
                })
            ).rejects.toThrow(/Refusing to publish/);
            expect(
                await raw.feat.count({ where: { campaignId: templateId } })
            ).toBe(2);
        });
    }
);
