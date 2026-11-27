import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildSecurity } from '@/lib/server/admin/security';
import {
    isLocalDevDatabaseEnv,
    singleConnectionDatabaseUrl,
} from '@/lib/server/test-support/local-db';
import { hashEmail } from '@/lib/utils/admin/email-hash';

const db = new PrismaClient({
    datasources: { db: { url: singleConnectionDatabaseUrl('DATABASE_URL') } },
    log: [],
});

const tag = randomUUID().slice(0, 8);

const ids = { a: `sc-a-${tag}`, b: `sc-b-${tag}`, c: `sc-c-${tag}` };

const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}-${tag}`;

const DAY = 86_400_000;

const email = (key: keyof typeof ids) => `${ids[key]}@example.test`;

const cleanup = async () => {
    await db.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await db.accountDeletion.deleteMany({
        where: { emailHash: hashEmail(email('c'), 'test-secret') },
    });
};

describe.skipIf(!isLocalDevDatabaseEnv())('buildSecurity', () => {
    beforeAll(async () => {
        vi.stubEnv('ADMIN_HASH_SECRET', 'test-secret');
        await cleanup();

        for (const key of ['a', 'b', 'c'] as const) {
            await db.user.create({
                data: {
                    id: ids[key],
                    email: email(key),
                    displayName: key,
                    createdAt: new Date(
                        Date.now() - (key === 'c' ? 1 : 5) * DAY
                    ),
                },
            });
        }

        for (const key of ['a', 'b'] as const)
            await db.userAccess.create({ data: { userId: ids[key], ip } });

        await db.accountDeletion.create({
            data: {
                deletedAt: new Date(Date.now() - 3 * DAY),
                by: 'self',
                accountAgeDays: 10,
                campaigns: 0,
                emailHash: hashEmail(email('c'), 'test-secret'),
            },
        });
    });

    afterAll(async () => {
        await cleanup();
        vi.unstubAllEnvs();
        await db.$disconnect();
    });

    it('finds the shared ip group', async () => {
        const s = await buildSecurity(7);

        const g = s.groups.find((x) => x.ip === ip);

        expect(g?.accounts.map((a) => a.userId).sort()).toEqual(
            [ids.a, ids.b].sort()
        );
        expect(g?.accounts[0].email).toContain('@example.test');
    });

    it('detects a re-registration by email hash', async () => {
        const s = await buildSecurity(7);

        expect(s.reRegistrations.map((r) => r.userId)).toEqual([ids.c]);
    });

    it('returns no re-registrations without the secret', async () => {
        vi.stubEnv('ADMIN_HASH_SECRET', '');

        expect((await buildSecurity(7)).reRegistrations).toEqual([]);
        vi.stubEnv('ADMIN_HASH_SECRET', 'test-secret');
    });
});
