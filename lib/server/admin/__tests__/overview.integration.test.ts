import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildOverview } from '@/lib/server/admin/overview';
import {
    isLocalDevDatabaseEnv,
    singleConnectionDatabaseUrl,
} from '@/lib/server/test-support/local-db';

const db = new PrismaClient({
    datasources: {
        db: { url: singleConnectionDatabaseUrl('DATABASE_URL') },
    },
    log: [],
});

const tag = randomUUID().slice(0, 8);

const ids = { a: `ov-a-${tag}`, b: `ov-b-${tag}`, c: `ov-c-${tag}` };

const DAY = 86_400_000;

const now = new Date();

const ago = (d: number) => new Date(now.getTime() - d * DAY);

const dayOnly = (d: number) => new Date(ago(d).toISOString().slice(0, 10));

const cleanup = async () => {
    await db.campaign.deleteMany({ where: { dmUserId: ids.b } });
    await db.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await db.accountDeletion.deleteMany({ where: { emailHash: tag } });
};

describe.skipIf(!isLocalDevDatabaseEnv())('buildOverview', () => {
    beforeAll(async () => {
        await cleanup();

        for (const [key, createdAt] of [
            ['a', ago(40)],
            ['b', ago(3)],
            ['c', ago(10)],
        ] as const) {
            await db.user.create({
                data: {
                    id: ids[key],
                    email: `${ids[key]}@example.test`,
                    displayName: key,
                    createdAt,
                },
            });
        }

        await db.campaign.create({
            data: {
                name: `ov-${tag}`,
                inviteCode: `ov-${tag}`,
                dmUserId: ids.b,
                createdAt: ago(2),
            },
        });
        await db.userActivityDay.createMany({
            data: [
                { userId: ids.a, day: dayOnly(0) },
                { userId: ids.a, day: dayOnly(1) },
            ],
        });
        await db.accountDeletion.create({
            data: {
                deletedAt: ago(2),
                by: 'self',
                accountAgeDays: 5,
                campaigns: 0,
                emailHash: tag,
            },
        });
    });

    afterAll(async () => {
        await cleanup();
        await db.$disconnect();
    });

    it('computes tiles for 7d', async () => {
        const o = await buildOverview('7d', now);

        expect(o.tiles.usersNew.value).toBeGreaterThanOrEqual(1);
        expect(o.tiles.usersDeleted.value).toBeGreaterThanOrEqual(1);
        expect(o.tiles.dau).toBeGreaterThanOrEqual(1);
        expect(o.tiles.activationRate).not.toBeNull();
        expect(o.series.days).toHaveLength(7);
        expect(o.series.usersTotal[6]).toBe(o.tiles.usersTotal);
    });
});
