import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/utils/api/require-platform-admin', () => ({
    requirePlatformAdmin: vi.fn().mockResolvedValue({ userId: 'dbl-admin' }),
}));

import { DELETE } from '@/app/api/admin/users/[id]/route';
import {
    isLocalDevDatabaseEnv,
    singleConnectionDatabaseUrl,
} from '@/lib/server/test-support/local-db';

const db = new PrismaClient({
    datasources: { db: { url: singleConnectionDatabaseUrl('DATABASE_URL') } },
    log: [],
});

const tag = randomUUID().slice(0, 8);

const id = (n: string) => `dbl-${tag}-${n}`;

const suiteStart = new Date();

const cleanup = async () => {
    await db.campaign.deleteMany({
        where: { id: { startsWith: `dbl-${tag}` } },
    });
    await db.user.deleteMany({ where: { id: { startsWith: `dbl-${tag}` } } });
    await db.adminAction.deleteMany({ where: { targetUserId: id('a') } });
};

describe.skipIf(!isLocalDevDatabaseEnv())(
    'admin delete blocked by templates',
    () => {
        beforeAll(async () => {
            await cleanup();

            for (const n of ['a', 'b'])
                await db.user.create({
                    data: {
                        id: id(n),
                        email: `${id(n)}@example.test`,
                        displayName: n,
                    },
                });

            await db.campaign.create({
                data: {
                    id: id('t'),
                    name: 't',
                    inviteCode: id('inv-t'),
                    dmUserId: id('a'),
                    kind: 'template',
                },
            });
            await db.campaign.create({
                data: {
                    id: id('c'),
                    name: 'c',
                    inviteCode: id('inv-c'),
                    dmUserId: id('b'),
                    createdFromId: id('t'),
                },
            });
        });

        afterAll(async () => {
            await cleanup();
            await db.$disconnect();
        });

        it('is 409 with the template ids and writes no audit rows', async () => {
            const res = await DELETE(
                new Request('http://localhost/x', {
                    method: 'DELETE',
                    body: JSON.stringify({ email: `${id('a')}@example.test` }),
                }),
                { params: Promise.resolve({ id: id('a') }) }
            );

            expect(res.status).toBe(409);
            expect((await res.json()).templateIds).toEqual([id('t')]);
            expect(
                await db.accountDeletion.count({
                    where: { deletedAt: { gte: suiteStart } },
                })
            ).toBe(0);
            expect(
                await db.adminAction.count({ where: { targetUserId: id('a') } })
            ).toBe(0);
            expect(
                await db.user.findUnique({ where: { id: id('a') } })
            ).not.toBeNull();
        });
    }
);
