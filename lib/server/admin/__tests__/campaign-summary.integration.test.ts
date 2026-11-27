import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getAdminCampaignSummary } from '@/lib/server/admin/campaign-summary';
import {
    isLocalDevDatabaseEnv,
    singleConnectionDatabaseUrl,
} from '@/lib/server/test-support/local-db';

const db = new PrismaClient({
    datasources: { db: { url: singleConnectionDatabaseUrl('DATABASE_URL') } },
    log: [],
});

const tag = randomUUID().slice(0, 8);

const ids = { dm: `cs-dm-${tag}`, p: `cs-p-${tag}` };

let campaignId = '';

const cleanup = async () => {
    await db.campaign.deleteMany({ where: { dmUserId: ids.dm } });
    await db.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
};

describe.skipIf(!isLocalDevDatabaseEnv())('getAdminCampaignSummary', () => {
    beforeAll(async () => {
        await cleanup();
        await db.user.createMany({
            data: Object.entries(ids).map(([k, id]) => ({
                id,
                email: `${id}@example.test`,
                displayName: k,
            })),
        });

        const c = await db.campaign.create({
            data: {
                name: `sum-${tag}`,
                inviteCode: `cs-${tag}`,
                dmUserId: ids.dm,
                rules: { system: { key: 'dnd5e' } },
            },
        });

        campaignId = c.id;
        await db.campaignMember.create({
            data: { campaignId, userId: ids.p, role: 'player' },
        });
        await db.battleMap.create({
            data: {
                campaignId,
                name: `m-${tag}`,
                cols: 1,
                rows: 1,
                header: {},
            },
        });
    });

    afterAll(async () => {
        await cleanup();
        await db.$disconnect();
    });

    it('returns null for an unknown campaign', async () => {
        expect(await getAdminCampaignSummary(`nope-${tag}`)).toBeNull();
    });

    it('counts match the seed', async () => {
        const s = await getAdminCampaignSummary(campaignId);

        expect(s?.system).toBe('dnd5e');
        expect(s?.owner.id).toBe(ids.dm);
        expect(s?.members).toEqual([
            { id: ids.p, displayName: 'p', role: 'player' },
        ]);
        expect(s?.counts).toMatchObject({ maps: 1, characters: 0, battles: 0 });
        expect(s?.template).toBeNull();
        expect(s?.storageBytes).toBeNull();
    });
});
