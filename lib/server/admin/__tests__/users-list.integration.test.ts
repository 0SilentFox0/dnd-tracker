import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { listAdminUsers } from '@/lib/server/admin/users-list';
import {
    isLocalDevDatabaseEnv,
    singleConnectionDatabaseUrl,
} from '@/lib/server/test-support/local-db';

const db = new PrismaClient({
    datasources: { db: { url: singleConnectionDatabaseUrl('DATABASE_URL') } },
    log: [],
});

const tag = randomUUID().slice(0, 8);

const uid = (i: number) => `ul-${tag}-${String(i).padStart(2, '0')}`;

const COUNT = 55;

const DAY = 86_400_000;

const cleanup = async () => {
    await db.campaign.deleteMany({
        where: { dmUserId: { startsWith: `ul-${tag}` } },
    });
    await db.user.deleteMany({ where: { id: { startsWith: `ul-${tag}` } } });
};

const all = async (query: Parameters<typeof listAdminUsers>[0]) => {
    const rows = [];

    let cursor: string | undefined;

    do {
        const page = await listAdminUsers({ ...query, cursor });

        rows.push(...page.rows);
        cursor = page.next ?? undefined;
    } while (cursor);

    return rows;
};

describe.skipIf(!isLocalDevDatabaseEnv())('listAdminUsers', () => {
    beforeAll(async () => {
        await cleanup();

        await db.user.createMany({
            data: Array.from({ length: COUNT }, (_, i) => ({
                id: uid(i),
                email: `u${i}-${tag}@example.test`,
                displayName: `User ${i}`,
                createdAt: new Date(Date.now() - (COUNT - i) * 60_000),
            })),
        });
        await db.campaign.createMany({
            data: [0, 1].map((n) => ({
                name: `c${n}-${tag}`,
                inviteCode: `ul-${tag}-${n}`,
                dmUserId: uid(3),
            })),
        });
        await db.userAccess.createMany({
            data: [
                { userId: uid(1), ip: `10.${tag}.a` },
                { userId: uid(2), ip: `10.${tag}.a` },
                {
                    userId: uid(4),
                    ip: `10.${tag}.b`,
                    lastSeen: new Date(Date.now() - 60 * DAY),
                },
                {
                    userId: uid(5),
                    ip: `10.${tag}.b`,
                    lastSeen: new Date(Date.now() - 60 * DAY),
                },
            ],
        });
    });

    afterAll(async () => {
        await cleanup();
        await db.$disconnect();
    });

    it('searches by part of an email', async () => {
        const page = await listAdminUsers({ q: `u7-${tag}` });

        expect(page.rows.map((r) => r.id)).toEqual([uid(7)]);
    });

    it('sorts by campaigns', async () => {
        const page = await listAdminUsers({ q: tag, sort: 'campaigns' });

        expect(page.rows[0].id).toBe(uid(3));
        expect(page.rows[0].campaignsDm).toBe(2);
    });

    it('paginates by keyset', async () => {
        const first = await listAdminUsers({ q: tag });

        expect(first.rows).toHaveLength(50);
        expect(first.next).not.toBeNull();

        const second = await listAdminUsers({ q: tag, cursor: first.next as string });

        expect(second.rows).toHaveLength(5);
        expect(second.next).toBeNull();
        expect(
            new Set([...first.rows, ...second.rows].map((r) => r.id)).size
        ).toBe(COUNT);
    });

    it('flags a shared ip within 30 days only', async () => {
        const rows = await all({ q: tag });

        const flag = (i: number) => rows.find((r) => r.id === uid(i))?.sharedIp;

        expect(flag(1)).toBe(true);
        expect(flag(2)).toBe(true);
        expect(flag(4)).toBe(false);
        expect(flag(5)).toBe(false);
    });
});
