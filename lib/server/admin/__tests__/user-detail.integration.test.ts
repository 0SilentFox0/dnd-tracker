import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getAdminUserDetail } from '@/lib/server/admin/user-detail';
import {
    isLocalDevDatabaseEnv,
    singleConnectionDatabaseUrl,
} from '@/lib/server/test-support/local-db';

const db = new PrismaClient({
    datasources: { db: { url: singleConnectionDatabaseUrl('DATABASE_URL') } },
    log: [],
});

const tag = randomUUID().slice(0, 8);

const ids = {
    me: `ud-me-${tag}`,
    other: `ud-other-${tag}`,
    dm: `ud-dm-${tag}`,
};

const cleanup = async () => {
    await db.campaign.deleteMany({
        where: { dmUserId: { in: Object.values(ids) } },
    });
    await db.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
};

describe.skipIf(!isLocalDevDatabaseEnv())('getAdminUserDetail', () => {
    beforeAll(async () => {
        await cleanup();
        await db.user.createMany({
            data: Object.entries(ids).map(([k, id]) => ({
                id,
                email: `${id}@example.test`,
                displayName: k,
            })),
        });

        const template = await db.campaign.create({
            data: {
                name: `tpl-${tag}`,
                inviteCode: `ud-t-${tag}`,
                dmUserId: ids.me,
                kind: 'template',
                contentVersion: 3,
            },
        });

        await db.campaign.create({
            data: {
                name: `clone-${tag}`,
                inviteCode: `ud-c-${tag}`,
                dmUserId: ids.other,
                createdFromId: template.id,
            },
        });

        const theirs = await db.campaign.create({
            data: {
                name: `theirs-${tag}`,
                inviteCode: `ud-j-${tag}`,
                dmUserId: ids.dm,
            },
        });

        await db.campaign.create({
            data: {
                name: `own-${tag}`,
                inviteCode: `ud-o-${tag}`,
                dmUserId: ids.me,
            },
        });
        await db.campaignMember.create({
            data: { campaignId: theirs.id, userId: ids.me, role: 'player' },
        });
        await db.userAccess.createMany({
            data: [
                { userId: ids.me, ip: `ud-${tag}-a` },
                { userId: ids.me, ip: `ud-${tag}-b` },
                { userId: ids.other, ip: `ud-${tag}-a` },
            ],
        });
    });

    afterAll(async () => {
        await cleanup();
        await db.$disconnect();
    });

    it('returns null for an unknown user', async () => {
        expect(await getAdminUserDetail(`nope-${tag}`)).toBeNull();
    });

    it('assembles the card', async () => {
        const d = await getAdminUserDetail(ids.me);

        expect(d?.user.campaignsDm).toBe(1);
        expect(d?.user.templates).toBe(1);
        expect(d?.owned).toHaveLength(2);
        expect(d?.joined.map((j) => j.name)).toEqual([`theirs-${tag}`]);
        expect(d?.joined[0].dm.id).toBe(ids.dm);
        expect(d?.templates).toMatchObject([
            { versions: 3, clones: 1, blocksDeletion: true },
        ]);
        expect(d?.access).toHaveLength(2);

        const shared = d?.access.find((a) => a.ip === `ud-${tag}-a`);

        expect(shared?.otherAccounts.map((o) => o.id)).toEqual([ids.other]);
        expect(
            d?.access.find((a) => a.ip === `ud-${tag}-b`)?.otherAccounts
        ).toEqual([]);
    });
});
