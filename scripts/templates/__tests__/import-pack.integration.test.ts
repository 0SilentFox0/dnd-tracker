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

import { importPack } from '../lib/import-pack';

import { createCampaignForUser } from '@/lib/server/campaigns/create-campaign';
import { listRaceProfiles } from '@/systems/wfrp/server/race-profile';

const marker = `grimload-${randomUUID()}`;

const fixtures = path.join(__dirname, 'fixtures/grim-fixture');

const GRIM_NAME = 'Grim d100';

const manifest = {
    key: 'grim-d100',
    system: 'wfrp',
    names: { en: GRIM_NAME, uk: GRIM_NAME },
    locales: ['en'],
    rules: { file: 'rules.json' },
    kinds: ['feats', 'careers', 'races', 'spells', 'units', 'artifacts'],
    extras: ['race-profiles'],
    icons: {},
    credits: '',
    counts: {
        feats: 2,
        careers: 2,
        races: 1,
        spells: 1,
        units: 1,
        artifacts: 2,
    },
};

const tmpDirs: string[] = [];

const mixedDir = (
    mutate: (name: string, rows: Array<Record<string, unknown>>) => void
) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grim-data-'));

    tmpDirs.push(dir);

    fs.mkdirSync(path.join(dir, 'grim-d100'));

    for (const file of fs
        .readdirSync(fixtures)
        .filter((f) => f.endsWith('.json'))) {
        const rows = JSON.parse(
            fs.readFileSync(path.join(fixtures, file), 'utf8')
        );

        if (Array.isArray(rows)) mutate(file.replace('.json', ''), rows);

        fs.writeFileSync(
            path.join(dir, 'grim-d100', file),
            JSON.stringify(rows)
        );
    }

    fs.writeFileSync(
        path.join(dir, 'grim-d100', 'manifest.json'),
        JSON.stringify(manifest)
    );

    return dir;
};

const goodDir = () => mixedDir(() => undefined);

const rowCounts = async (templateId: string) => ({
    campaigns: await raw.campaign.count({
        where: { kind: 'template', name: GRIM_NAME },
    }),
    feats: await raw.feat.count({ where: { campaignId: templateId } }),
    careers: await raw.career.count({ where: { campaignId: templateId } }),
    races: await raw.race.count({ where: { campaignId: templateId } }),
    spells: await raw.spell.count({ where: { campaignId: templateId } }),
    units: await raw.unit.count({ where: { campaignId: templateId } }),
    artifacts: await raw.artifact.count({ where: { campaignId: templateId } }),
    featBase: await raw.featBase.count({
        where: { sourceCampaignId: templateId },
    }),
    careerBase: await raw.careerBase.count({
        where: { sourceCampaignId: templateId },
    }),
    raceBase: await raw.raceBase.count({
        where: { sourceCampaignId: templateId },
    }),
});

const unitSpellLinks = async (templateId: string) => {
    const spell = await raw.spell.findFirstOrThrow({
        where: { campaignId: templateId, name: 'Rot Touch' },
        select: { id: true },
    });

    const unit = await raw.unit.findFirstOrThrow({
        where: { campaignId: templateId, name: 'Giant Rat' },
        select: { knownSpells: true },
    });

    return { spellId: spell.id, links: unit.knownSpells };
};

const versionOf = async (templateId: string) =>
    (
        await raw.campaign.findUniqueOrThrow({
            where: { id: templateId },
            select: { contentVersion: true },
        })
    ).contentVersion;

describe.skipIf(!isLocalDevDatabaseEnv())('grim template loader', () => {
    let templateId = '';

    let guardPassed = false;

    const userId = marker;

    beforeAll(async () => {
        if (
            await raw.campaign.count({
                where: { kind: 'template', name: GRIM_NAME },
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
        for (const dir of tmpDirs)
            fs.rmSync(dir, { recursive: true, force: true });
        await raw.$disconnect();
    });

    it('rejects broken data before any write', async () => {
        const before = await rowCounts('none');

        const unknownTalent = mixedDir((name, rows) => {
            if (name === 'careers') rows[0].tier1_talents = ['Missing Talent'];
        });

        await expect(
            importPack('grim-d100', {
                owner: userId,
                dir: unknownTalent,
                publish: true,
            })
        ).rejects.toThrow(/Missing Talent/);

        const extraField = mixedDir((name, rows) => {
            if (name === 'feats') rows[0].bogus = 1;
        });

        await expect(
            importPack('grim-d100', {
                owner: userId,
                dir: extraField,
                publish: true,
            })
        ).rejects.toThrow(/bogus/);
        expect(await rowCounts('none')).toEqual(before);
    });

    it('creates, imports and publishes the template', async () => {
        const result = await importPack('grim-d100', {
            owner: userId,
            dir: goodDir(),
            publish: true,
        });

        templateId = result.templateId as string;
        expect(result.created).toBe(true);
        expect(
            Object.fromEntries(
                Object.entries(result.perKind).map(([kind, c]) => [
                    kind,
                    c.created,
                ])
            )
        ).toEqual({
            feats: 2,
            careers: 2,
            races: 1,
            spells: 1,
            units: 1,
            artifacts: 2,
        });

        const counts = await rowCounts(templateId);

        const { spellId, links } = await unitSpellLinks(templateId);

        expect(links).toEqual([spellId]);
        expect(counts).toMatchObject({
            campaigns: 1,
            feats: 2,
            careers: 2,
            races: 1,
            spells: 1,
            units: 1,
            artifacts: 2,
            featBase: 2,
            careerBase: 2,
            raceBase: 1,
        });
        expect(
            (
                await raw.feat.findMany({
                    where: { campaignId: templateId },
                    select: { slug: true },
                    orderBy: { slug: 'asc' },
                })
            ).map((r) => r.slug)
        ).toEqual(['hardy', 'sharp-eyed']);
        expect(
            (
                await raw.careerBase.findMany({
                    where: { sourceCampaignId: templateId, validTo: null },
                    select: { slug: true },
                })
            ).every((r) => r.slug)
        ).toBe(true);
        expect(
            (
                await raw.race.findFirstOrThrow({
                    where: { campaignId: templateId },
                })
            ).slug
        ).toBe('hollander');
    });

    it('a clone sees the species with its profile', async () => {
        const created = await createCampaignForUser(
            userId,
            { name: `${marker}-clone`, templateId },
            { defer: () => undefined }
        );

        if (!created.ok) throw new Error('clone failed');

        invalidateCampaignLayer();

        const profiles = await listRaceProfiles(created.campaign.id);

        expect(profiles).toHaveLength(1);
        expect(profiles[0].profile).toMatchObject({
            move: 4,
            fate: 2,
            randomTalentCount: 1,
        });
        expect(profiles[0].profile.talents).toHaveLength(1);
        expect(profiles[0].profile.careerTable).toHaveLength(2);
        expect(
            profiles[0].profile.careerTable.every(
                (r) => (r.careerId as string).length > 10
            )
        ).toBe(true);
    });

    it('a rerun backfills the slug of a row that predates slugs, without creating a duplicate', async () => {
        await raw.feat.updateMany({
            where: { campaignId: templateId, name: 'Hardy' },
            data: { slug: null },
        });

        const before = await rowCounts(templateId);

        await importPack('grim-d100', {
            owner: userId,
            dir: goodDir(),
            publish: true,
        });

        expect(await rowCounts(templateId)).toEqual(before);
        expect(
            (
                await raw.feat.findFirstOrThrow({
                    where: { campaignId: templateId, name: 'Hardy' },
                })
            ).slug
        ).toBe('hardy');
    });

    it('a second run keeps the row counts, unit spell links, the template and its contentVersion', async () => {
        const before = await rowCounts(templateId);

        const links = await unitSpellLinks(templateId);

        const version = await versionOf(templateId);

        const result = await importPack('grim-d100', {
            owner: userId,
            dir: goodDir(),
            publish: true,
        });

        expect(result).toMatchObject({ templateId, created: false });
        expect(await rowCounts(templateId)).toEqual(before);
        expect(await unitSpellLinks(templateId)).toEqual(links);
        expect(await versionOf(templateId)).toBe(version);
    });

    it('a rerun without --publish updates nothing and keeps contentVersion', async () => {
        const version = await versionOf(templateId);

        const result = await importPack('grim-d100', {
            owner: userId,
            dir: goodDir(),
        });

        const kinds = Object.values(result.perKind);

        expect(kinds.reduce((sum, c) => sum + c.created + c.updated, 0)).toBe(
            0
        );
        expect(kinds.reduce((sum, c) => sum + c.skipped, 0)).toBeGreaterThan(0);
        expect(await versionOf(templateId)).toBe(version);
    });
});
