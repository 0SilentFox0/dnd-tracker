import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { contentLayer } from '@/lib/db/content-layer';
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
import { readPack } from '../lib/pack';

const marker = `shells-${randomUUID()}`;

const SHELLS = ['srd-5.2-empty', 'grim-d100-empty'];

describe.skipIf(!isLocalDevDatabaseEnv())(
    'shell packs (rules without content)',
    () => {
        let guardPassed = false;

        beforeAll(async () => {
            if (
                await raw.campaign.count({
                    where: { kind: 'template', templateKey: { in: SHELLS } },
                })
            )
                throw new Error(
                    'a shell template already exists in the test database'
                );

            guardPassed = true;

            await raw.user.create({
                data: {
                    id: marker,
                    email: `${marker}@example.invalid`,
                    displayName: marker,
                },
            });
            vi.spyOn(console, 'info').mockImplementation(() => undefined);
        });

        afterAll(async () => {
            if (!guardPassed) return void (await raw.$disconnect());

            await raw.campaign.deleteMany({ where: { dmUserId: marker } });
            await raw.user.deleteMany({ where: { id: marker } });
            await raw.$disconnect();
        });

        it.each(SHELLS)(
            '%s: creates the template with the pack rules and no rows',
            async (key) => {
                const result = await importPack(key, {
                    owner: marker,
                    publish: true,
                });

                expect(result).toMatchObject({ created: true, perKind: {} });

                const campaign = await raw.campaign.findUniqueOrThrow({
                    where: { id: result.templateId as string },
                });

                expect(campaign.templateKey).toBe(key);
                expect(campaign.rules).toEqual(readPack(key).rules);

                const where = { campaignId: campaign.id };

                expect(
                    (await raw.feat.count({ where })) +
                        (await raw.spell.count({ where })) +
                        (await raw.unit.count({ where })) +
                        (await raw.race.count({ where }))
                ).toBe(0);
            }
        );
    }
);
