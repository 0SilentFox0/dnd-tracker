import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
    unstable_cache: (fn: unknown) => fn,
    revalidateTag: vi.fn(),
}));

vi.mock('@/lib/server/templates/import-bundle', async (orig) => {
    const actual =
        await orig<typeof import('@/lib/server/templates/import-bundle')>();

    return {
        ...actual,
        importBundle: vi.fn(
            (...args: Parameters<typeof actual.importBundle>) => {
                if (args[2].endsWith('-bad')) throw new Error('forced failure');

                return actual.importBundle(...args);
            }
        ),
    };
});

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

const marker = `copy-${randomUUID()}`;

const src = `${marker}-src`;

const tgt = `${marker}-tgt`;

const bad = `${marker}-bad`;

const fresh = `${marker}-fresh`;

const tpl = `${marker}-tpl`;

const cuid = () => `c${randomUUID().replaceAll('-', '').slice(0, 24)}`;

const ids = Object.fromEntries(
    ['r', 'r-tgt', 'u', 's'].map((k) => [k, cuid()])
);

const id = (key: string) => ids[key];

const items = [
    { kind: 'units' as const, ids: [id('u')] },
    { kind: 'spells' as const, ids: [id('s')] },
];

const copy = (campaignIds = [tgt], dryRun?: boolean) =>
    copyContent({
        actor: sessionDmActor(src, marker),
        items,
        targets: { campaignIds },
        dryRun,
    });

describe.skipIf(!isLocalDevDatabaseEnv())('copyContent (local DB)', () => {
    beforeAll(async () => {
        await raw.user.create({
            data: {
                id: marker,
                email: `${marker}@example.invalid`,
                displayName: marker,
            },
        });

        for (const [cid, kind] of [
            [src, 'campaign'],
            [tgt, 'campaign'],
            [tpl, 'template'],
            [bad, 'campaign'],
            [fresh, 'campaign'],
        ] as const) {
            await raw.campaign.create({
                data: {
                    id: cid,
                    name: cid,
                    kind,
                    dmUserId: marker,
                    inviteCode: randomUUID(),
                    rules: initialRules({ key: 'dnd5e' }),
                } as never,
            });
            await raw.campaignMember.create({
                data: { campaignId: cid, userId: marker, role: 'dm' } as never,
            });
        }

        await raw.race.create({
            data: {
                id: id('r'),
                campaignId: src,
                name: 'Elf',
                color: '#fff',
            } as never,
        });
        await raw.race.create({
            data: {
                id: id('r-tgt'),
                campaignId: tgt,
                name: 'Elf',
                color: '#000',
            } as never,
        });
        await raw.unit.create({
            data: {
                id: id('u'),
                campaignId: src,
                name: 'Archer',
                raceId: id('r'),
                level: 1,
                maxHp: 5,
                armorClass: 10,
            } as never,
        });
        await raw.spell.create({
            data: {
                id: id('s'),
                campaignId: src,
                name: 'Bolt',
                type: 'target',
                damageType: 'damage',
                level: 1,
            } as never,
        });
    });

    afterAll(async () => {
        for (const m of ['unit', 'spell', 'race'] as const)
            await (
                raw[m] as unknown as {
                    deleteMany(a: unknown): Promise<unknown>;
                }
            ).deleteMany({
                where: { campaignId: { in: [src, tgt, tpl, bad, fresh] } },
            });

        await raw.campaignMember.deleteMany({ where: { userId: marker } });
        await raw.campaign.deleteMany({
            where: { id: { in: [src, tgt, tpl, bad, fresh] } },
        });
        await raw.user.delete({ where: { id: marker } });
        await raw.$disconnect();
    });

    it('dry run writes nothing', async () => {
        const { targets } = await copy([tgt], true);

        expect(targets[0].created.length).toBeGreaterThan(0);
        expect(await raw.unit.count({ where: { campaignId: tgt } })).toBe(0);
    });

    it('copies detached rows and links the unit to the existing race', async () => {
        const { targets } = await copy();

        expect(targets[0].error).toBeUndefined();
        expect(targets[0].status).toBe('ok');

        const unit = await raw.unit.findFirstOrThrow({
            where: { campaignId: tgt, name: 'Archer' },
        });

        expect(unit.id).not.toBe(id('u'));
        expect(
            (unit as { sourceId?: string | null }).sourceId ?? null
        ).toBeNull();
        expect(unit.raceId).toBe(id('r-tgt'));
        expect(await raw.race.count({ where: { campaignId: tgt } })).toBe(1);
        expect(
            await raw.spell.count({ where: { campaignId: tgt, name: 'Bolt' } })
        ).toBe(1);
    });

    it('a repeated run creates nothing', async () => {
        const { targets } = await copy();

        expect(targets[0].created).toEqual([]);
        expect(targets[0].skipped.length).toBeGreaterThan(0);
        expect(targets[0].reused).toEqual([]);
        expect(await raw.unit.count({ where: { campaignId: tgt } })).toBe(1);
        expect(await raw.race.count({ where: { campaignId: tgt } })).toBe(1);
        expect(
            await raw.spell.count({ where: { campaignId: tgt, name: 'Bolt' } })
        ).toBe(1);
    });

    it('a failing target rolls back and does not affect the other', async () => {
        const errorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        const { targets } = await copy([bad, fresh]);

        expect(targets.find((t) => t.campaignId === bad)).toMatchObject({
            status: 'failed',
            error: 'errors.internal',
            created: [],
        });
        expect(targets.find((t) => t.campaignId === fresh)?.status).toBe('ok');
        expect(await raw.unit.count({ where: { campaignId: bad } })).toBe(0);
        expect(await raw.unit.count({ where: { campaignId: fresh } })).toBe(1);
        errorSpy.mockRestore();
    });

    it('a template campaign is not a valid target', async () => {
        await expect(copy([tpl])).rejects.toMatchObject({ status: 403 });
    });
});
