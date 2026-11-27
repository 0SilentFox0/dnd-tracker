import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { recordActivity } from '@/lib/server/admin/record-activity';
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

const uid = `act-${randomUUID().slice(0, 8)}`;

const DAY = 86_400_000;

const t0 = new Date('2026-03-10T10:00:00Z');

const cleanup = () => db.user.deleteMany({ where: { id: uid } });

const input = (over: Record<string, unknown> = {}) => ({
    userId: uid,
    ip: '203.0.113.7',
    country: 'UA',
    device: 'Chrome / macOS',
    now: t0,
    ...over,
});

describe.skipIf(!isLocalDevDatabaseEnv())('recordActivity', () => {
    beforeEach(async () => {
        await cleanup();
        await db.user.create({
            data: { id: uid, email: `${uid}@example.test`, displayName: 'a' },
        });
    });

    afterAll(async () => {
        await cleanup();
        await db.$disconnect();
    });

    it('two calls the same day keep one day row and days = 1', async () => {
        await recordActivity(input());
        await recordActivity(input({ now: new Date(t0.getTime() + 3600_000) }));

        expect(await db.userActivityDay.count({ where: { userId: uid } })).toBe(
            1
        );

        const rows = await db.userAccess.findMany({ where: { userId: uid } });

        expect(rows).toHaveLength(1);
        expect(rows[0].days).toBe(1);
    });

    it('the next day adds a day row and increments days', async () => {
        await recordActivity(input());
        await recordActivity(input({ now: new Date(t0.getTime() + DAY) }));

        expect(await db.userActivityDay.count({ where: { userId: uid } })).toBe(
            2
        );
        expect(
            (await db.userAccess.findFirstOrThrow({ where: { userId: uid } }))
                .days
        ).toBe(2);
    });

    it('keeps old country/device when the new call has none', async () => {
        await recordActivity(input());
        await recordActivity(input({ country: null, device: null }));

        const row = await db.userAccess.findFirstOrThrow({
            where: { userId: uid },
        });

        expect(row.country).toBe('UA');
        expect(row.device).toBe('Chrome / macOS');
    });

    it('ip null records only the day', async () => {
        await recordActivity(input({ ip: null }));

        expect(await db.userActivityDay.count({ where: { userId: uid } })).toBe(
            1
        );
        expect(await db.userAccess.count({ where: { userId: uid } })).toBe(0);
    });

    it('an unknown user does not throw', async () => {
        await expect(
            recordActivity(input({ userId: `${uid}-missing` }))
        ).resolves.toBeUndefined();
    });
});
