import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
    unstable_cache: (fn: unknown) => fn,
    revalidateTag: vi.fn(),
}));

import { invalidateCampaignLayer } from '@/lib/db/content-layer';
import { copyContent } from '@/lib/server/content/copy/service';
import {
    isLocalDevDatabaseEnv,
    singleConnectionDatabaseUrl,
} from '@/lib/server/test-support/local-db';
import { sessionDmActor } from '@/lib/utils/api/actor';
import { initialRules } from '@/lib/utils/rules/initial-rules';

const raw = new PrismaClient({
    datasources: { db: { url: singleConnectionDatabaseUrl('DATABASE_URL') } },
});

const marker = `copylay-${randomUUID()}`;

const src = `${marker}-src`;

const tpl = `${marker}-tpl`;

const lay = `${marker}-lay`;

const cuid = () => `c${randomUUID().replaceAll('-', '').slice(0, 24)}`;

const ids = Object.fromEntries(
    ['srcHuman', 'srcElf', 'u1', 'u2', 'baseHuman', 'baseElf', 'ovElf'].map(
        (k) => [k, cuid()]
    )
);

describe.skipIf(!isLocalDevDatabaseEnv())(
    'copyContent into a layered target (local DB)',
    () => {
        beforeAll(async () => {
            await raw.user.create({
                data: {
                    id: marker,
                    email: `${marker}@example.invalid`,
                    displayName: marker,
                },
            });

            for (const [cid, extra] of [
                [src, { kind: 'campaign' }],
                [tpl, { kind: 'template' }],
                [
                    lay,
                    {
                        kind: 'campaign',
                        baseSourceId: tpl,
                        baseVersion: 1,
                    },
                ],
            ] as const) {
                await raw.campaign.create({
                    data: {
                        id: cid,
                        name: cid,
                        dmUserId: marker,
                        inviteCode: randomUUID(),
                        rules: initialRules({ key: 'dnd5e' }),
                        ...extra,
                    } as never,
                });
                await raw.campaignMember.create({
                    data: {
                        campaignId: cid,
                        userId: marker,
                        role: 'dm',
                    } as never,
                });
            }

            for (const [key, name] of [
                ['baseHuman', 'Human'],
                ['baseElf', 'Elf'],
            ] as const)
                await raw.raceBase.create({
                    data: {
                        id: ids[key],
                        name,
                        updatedAt: new Date(),
                        sourceCampaignId: tpl,
                        validFrom: 1,
                    },
                });

            await raw.race.create({
                data: {
                    id: ids.ovElf,
                    campaignId: lay,
                    name: 'Elf',
                    color: '#123',
                    sourceId: ids.baseElf,
                } as never,
            });

            for (const [key, name] of [
                ['srcHuman', 'Human'],
                ['srcElf', 'Elf'],
            ] as const)
                await raw.race.create({
                    data: {
                        id: ids[key],
                        campaignId: src,
                        name,
                        color: '#fff',
                    } as never,
                });

            for (const [key, name, race] of [
                ['u1', 'Fighter', 'srcHuman'],
                ['u2', 'Ranger', 'srcElf'],
            ] as const)
                await raw.unit.create({
                    data: {
                        id: ids[key],
                        campaignId: src,
                        name,
                        raceId: ids[race],
                        level: 1,
                        maxHp: 5,
                        armorClass: 10,
                    } as never,
                });

            invalidateCampaignLayer();
        });

        afterAll(async () => {
            await raw.unit.deleteMany({
                where: { campaignId: { in: [src, lay] } },
            });
            await raw.race.deleteMany({
                where: { campaignId: { in: [src, lay] } },
            });
            await raw.raceBase.deleteMany({ where: { sourceCampaignId: tpl } });
            await raw.campaignMember.deleteMany({ where: { userId: marker } });
            await raw.campaign.deleteMany({
                where: { id: { in: [src, tpl, lay] } },
            });
            await raw.user.delete({ where: { id: marker } });
            await raw.$disconnect();
        });

        it('reuses a base row and an override of the layered target', async () => {
            const { targets } = await copyContent({
                actor: sessionDmActor(src, marker),
                items: [{ kind: 'units', ids: [ids.u1, ids.u2] }],
                targets: { campaignIds: [lay] },
            });

            expect(targets[0].error).toBeUndefined();
            expect(targets[0].status).not.toBe('failed');
            expect(targets[0].reused.map((r) => r.name).sort()).toEqual([
                'Elf',
                'Human',
            ]);

            const units = await raw.unit.findMany({
                where: { campaignId: lay },
                orderBy: { name: 'asc' },
            });

            expect(units.map((u) => u.name)).toEqual(['Fighter', 'Ranger']);
            expect(units[0].raceId).toBe(ids.baseHuman);
            expect(await raw.race.count({ where: { campaignId: lay } })).toBe(
                1
            );
        });
    }
);
