import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';

import { logAdminAction } from '@/lib/server/admin/admin-actions';
import {
    isLocalDevDatabaseEnv,
    singleConnectionDatabaseUrl,
} from '@/lib/server/test-support/local-db';

const db = new PrismaClient({
    datasources: { db: { url: singleConnectionDatabaseUrl('DATABASE_URL') } },
    log: [],
});

const tag = randomUUID().slice(0, 8);

const target = `aa-target-${tag}`;

describe.skipIf(!isLocalDevDatabaseEnv())('logAdminAction', () => {
    afterAll(async () => {
        await db.adminAction.deleteMany({ where: { targetUserId: target } });
        await db.$disconnect();
    });

    it('writes one row with the meta', async () => {
        await logAdminAction(
            {
                adminUserId: 'aa-admin',
                action: 'ban',
                targetUserId: target,
                meta: { hours: 24 },
            },
            db
        );

        const rows = await db.adminAction.findMany({
            where: { targetUserId: target },
        });

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ action: 'ban', meta: { hours: 24 } });
    });
});
