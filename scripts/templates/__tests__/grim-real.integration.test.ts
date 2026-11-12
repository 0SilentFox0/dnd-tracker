import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
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
import { grimData } from '../systems/wfrp/__tests__/pack-helpers';

import { createCampaignForUser } from '@/lib/server/campaigns/create-campaign';
import { listRaceProfiles } from '@/systems/wfrp/server/race-profile';

const marker = `grimreal-${randomUUID()}`;

const rowCounts = async (templateId: string) => ({
    feats: await raw.feat.count({ where: { campaignId: templateId } }),
    careers: await raw.career.count({ where: { campaignId: templateId } }),
    races: await raw.race.count({ where: { campaignId: templateId } }),
    units: await raw.unit.count({ where: { campaignId: templateId } }),
    spells: await raw.spell.count({ where: { campaignId: templateId } }),
    artifacts: await raw.artifact.count({ where: { campaignId: templateId } }),
});

describe.skipIf(!isLocalDevDatabaseEnv())('grim-d100 real data load', () => {
    let templateId = '';

    let guardPassed = false;

    const userId = marker;

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

    it('loads the real catalog', async () => {
        const result = await importPack('grim-d100', {
            owner: userId,
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
            feats: 50,
            careers: 16,
            races: 4,
            units: 30,
            spells: 30,
            artifacts: 56,
        });
        expect(Object.values(result.perKind).every((c) => c.errors === 0)).toBe(
            true
        );
    });

    it('a clone sees every species profile with id-based career tables', async () => {
        const created = await createCampaignForUser(
            userId,
            { name: `${marker}-clone`, templateId },
            { defer: () => undefined }
        );

        if (!created.ok) throw new Error('clone failed');

        invalidateCampaignLayer();

        const profiles = await listRaceProfiles(created.campaign.id);

        expect(profiles).toHaveLength(4);

        const data = grimData();

        const [careers, feats] = await Promise.all([
            scoped.career.findMany({
                where: { campaignId: created.campaign.id },
                select: { id: true, name: true },
            }),
            scoped.feat.findMany({
                where: { campaignId: created.campaign.id },
                select: { id: true, name: true, abilities: true },
            }),
        ]);

        const careerIds = new Set(careers.map((c) => c.id));

        const featIds = new Set(feats.map((f) => f.id));

        const featByName = new Map(feats.map((f) => [f.name, f.id]));

        const careerByName = new Map(careers.map((c) => [c.name, c.id]));

        expect(careers).toHaveLength(data.careers.length);
        expect(feats).toHaveLength(data.feats.length);

        for (const { race, profile } of data.raceProfiles) {
            const stored = profiles.find(
                (p) =>
                    p.profile.careerTable.length ===
                        profile.careerTable.length &&
                    p.profile.careerTable.every(
                        (r, i) => r.max === profile.careerTable[i].max
                    )
            );

            expect(stored, race).toBeDefined();
            expect(stored?.profile.careerTable.map((r) => r.careerId)).toEqual(
                profile.careerTable.map((r) => careerByName.get(r.careerId))
            );
            expect(stored?.profile.talents).toEqual(
                profile.talents.map((t) => featByName.get(t))
            );
            expect(stored?.profile.randomTalents.map((r) => r.featId)).toEqual(
                profile.randomTalents.map((r) => featByName.get(r.featId))
            );
        }

        for (const { profile } of profiles) {
            expect(
                profile.careerTable.every((r) => careerIds.has(r.careerId))
            ).toBe(true);
            expect(
                [
                    ...profile.talents,
                    ...profile.randomTalents.map((r) => r.featId),
                ].every((id) => featIds.has(id))
            ).toBe(true);
        }

        const mechanical = data.feats.filter(
            (f) => Array.isArray(f.abilities) && f.abilities.length > 0
        );

        expect(mechanical).toHaveLength(20);

        for (const feat of mechanical)
            expect(feats.find((f) => f.name === feat.name)?.abilities).toEqual(
                feat.abilities
            );
    });

    it('a clone carries every unit with characteristics, traits and theme', async () => {
        const created = await createCampaignForUser(
            userId,
            { name: `${marker}-units`, templateId },
            { defer: () => undefined }
        );

        if (!created.ok) throw new Error('clone failed');

        invalidateCampaignLayer();

        const data = grimData();

        const units = await scoped.unit.findMany({
            where: { campaignId: created.campaign.id },
            select: {
                name: true,
                level: true,
                maxHp: true,
                speed: true,
                initiative: true,
                gridSize: true,
                abilities: true,
                characteristics: true,
                statblock: true,
            },
        });

        expect(units).toHaveLength(data.units.length);

        for (const row of data.units) {
            const unit = units.find((u) => u.name === row.name);

            expect(unit, String(row.name)).toMatchObject({
                level: row.level,
                maxHp: row.maxHp,
                speed: row.speed,
                initiative: row.initiative,
                gridSize: row.gridSize,
                statblock: row.statblock,
                abilities: row.abilities,
            });
            expect(unit?.characteristics, String(row.name)).toMatchObject(
                row.characteristics as object
            );
        }
    });

    it('a clone carries spells, item stats, miscast tables and unit spell links', async () => {
        const created = await createCampaignForUser(
            userId,
            { name: `${marker}-arsenal`, templateId },
            { defer: () => undefined }
        );

        if (!created.ok) throw new Error('clone failed');

        invalidateCampaignLayer();

        const data = grimData();

        const campaignId = created.campaign.id;

        const [spells, artifacts, units, campaign] = await Promise.all([
            scoped.spell.findMany({
                where: { campaignId },
                select: {
                    id: true,
                    name: true,
                    casting: true,
                    targeting: true,
                    spellEffects: true,
                    ingredients: true,
                    lists: true,
                },
            }),
            scoped.artifact.findMany({
                where: { campaignId },
                select: {
                    name: true,
                    slot: true,
                    rarity: true,
                    systemStats: true,
                },
            }),
            scoped.unit.findMany({
                where: { campaignId },
                select: { name: true, knownSpells: true },
            }),
            raw.campaign.findUniqueOrThrow({
                where: { id: campaignId },
                select: { rules: true },
            }),
        ]);

        expect(spells).toHaveLength(data.spells.length);
        expect(artifacts).toHaveLength(data.artifacts.length);

        for (const row of data.spells) {
            const spell = spells.find((s) => s.name === row.name);

            expect(spell, String(row.name)).toMatchObject({
                casting: row.casting,
                targeting: row.targeting,
                spellEffects: row.spellEffects,
                ingredients: row.ingredients ?? [],
                lists: row.lists,
            });
        }

        for (const row of data.artifacts) {
            const artifact = artifacts.find((a) => a.name === row.name);

            expect(artifact, String(row.name)).toBeDefined();
            expect(artifact?.slot, String(row.name)).toEqual(row.slot);
            expect(artifact?.rarity, String(row.name)).toEqual(row.rarity);
            expect(artifact?.systemStats, String(row.name)).toEqual(
                row.systemStats
            );
        }

        expect((campaign.rules as { tables?: unknown }).tables).toEqual(
            data.rules?.tables
        );

        const nameById = new Map(spells.map((s) => [s.id, s.name]));

        for (const row of data.units) {
            const unit = units.find((u) => u.name === row.name);

            const expected = (row.knownSpells ?? []) as string[];

            expect(
                ((unit?.knownSpells ?? []) as string[])
                    .map((id) => nameById.get(id))
                    .sort(),
                String(row.name)
            ).toEqual([...expected].sort());
        }
    });

    it('a second run is a no-op', async () => {
        const before = await rowCounts(templateId);

        const version = (
            await raw.campaign.findUniqueOrThrow({
                where: { id: templateId },
                select: { contentVersion: true },
            })
        ).contentVersion;

        const result = await importPack('grim-d100', {
            owner: userId,
            publish: true,
        });

        expect(result).toMatchObject({
            templateId,
            created: false,
            published: { added: 0, changed: 0, removed: 0 },
        });
        expect(
            Object.values(result.perKind).every(
                (c) => c.created === 0 && c.errors === 0
            )
        ).toBe(true);
        expect(await rowCounts(templateId)).toEqual(before);
        expect(
            (
                await raw.campaign.findUniqueOrThrow({
                    where: { id: templateId },
                    select: { contentVersion: true },
                })
            ).contentVersion
        ).toBe(version);
    });
});
