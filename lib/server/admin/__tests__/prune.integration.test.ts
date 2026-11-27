import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { pruneAdminData } from '@/lib/server/admin/prune';
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

const uid = `prn-${randomUUID().slice(0, 8)}`;

const DAY = 86_400_000;

const now = new Date('2026-06-01T12:00:00Z');

const ago = (d: number) => new Date(now.getTime() - d * DAY);

const cleanup = () => db.user.deleteMany({ where: { id: uid } });

describe.skipIf(!isLocalDevDatabaseEnv())('pruneAdminData', () => {
    beforeEach(async () => {
        await cleanup();
        await db.user.create({
            data: { id: uid, email: `${uid}@example.test`, displayName: 'p' },
        });
    });

    afterAll(async () => {
        await cleanup();
        await db.$disconnect();
    });

    it('drops access older than 180 days and activity older than 400', async () => {
        await db.userAccess.createMany({
            data: [
                { userId: uid, ip: '1.1.1.1', lastSeen: ago(181) },
                { userId: uid, ip: '2.2.2.2', lastSeen: ago(179) },
            ],
        });
        await db.userActivityDay.createMany({
            data: [
                { userId: uid, day: ago(401) },
                { userId: uid, day: ago(399) },
            ],
        });

        await pruneAdminData(now);

        const ips = (
            await db.userAccess.findMany({ where: { userId: uid } })
        ).map((r) => r.ip);

        expect(ips).toEqual(['2.2.2.2']);
        expect(await db.userActivityDay.count({ where: { userId: uid } })).toBe(
            1
        );
    });
});
