import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const files = vi.hoisted(() => ({
    copy: vi.fn(),
    remove: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/copy-object', () => ({
    copyStorageObject: files.copy,
}));
vi.mock('@/lib/server/battle-maps/background-upload', () => ({
    ownedBattleMapBackgroundPath: (campaign: string, url: string) =>
        url.includes(`/${campaign}/`) ? url.slice(url.indexOf(campaign)) : null,
    removeBattleMapBackgroundFiles: files.remove,
}));

import { copyMaps } from '@/lib/server/content/copy/maps';
import {
    isLocalDevDatabaseEnv,
    singleConnectionDatabaseUrl,
} from '@/lib/server/test-support/local-db';
import { initialRules } from '@/lib/utils/rules/initial-rules';

const raw = new PrismaClient({
    datasources: { db: { url: singleConnectionDatabaseUrl('DATABASE_URL') } },
});

const marker = `cpmap-${randomUUID()}`;

const src = `${marker}-src`;

const tgt = `${marker}-tgt`;

const BG = `https://x.test/storage/battle-maps/${src}/${'a'.repeat(32)}.png`;

const mapId = `c${randomUUID().replaceAll('-', '').slice(0, 24)}`;

const run = (dryRun?: boolean) =>
    copyMaps({
        sourceCampaignId: src,
        targetCampaignId: tgt,
        ids: [mapId],
        dryRun,
    });

describe.skipIf(!isLocalDevDatabaseEnv())('copyMaps (local DB)', () => {
    beforeAll(async () => {
        await raw.user.create({
            data: {
                id: marker,
                email: `${marker}@example.invalid`,
                displayName: marker,
            },
        });

        for (const cid of [src, tgt])
            await raw.campaign.create({
                data: {
                    id: cid,
                    name: cid,
                    kind: 'campaign',
                    dmUserId: marker,
                    inviteCode: randomUUID(),
                    rules: initialRules({ key: 'dnd5e' }),
                } as never,
            });

        await raw.battleMap.create({
            data: {
                id: mapId,
                campaignId: src,
                name: 'Cave',
                cols: 20,
                rows: 20,
                mapVersion: 3,
                header: { cols: 20, rows: 20, background: BG },
                chunks: {
                    create: [
                        { cx: 0, cy: 0, data: 'AAA' },
                        {
                            cx: 1,
                            cy: 0,
                            data: 'BBB',
                            tileLayers: { floor: 'x' },
                        },
                    ],
                },
                versions: {
                    create: { version: 3, payload: { header: {}, chunks: {} } },
                },
            },
        });
    });

    afterAll(async () => {
        await raw.battleMap.deleteMany({
            where: { campaignId: { in: [src, tgt] } },
        });
        await raw.campaign.deleteMany({ where: { id: { in: [src, tgt] } } });
        await raw.user.delete({ where: { id: marker } });
        await raw.$disconnect();
    });

    it('dry run writes nothing', async () => {
        const result = await run(true);

        expect(result.created).toHaveLength(1);
        expect(await raw.battleMap.count({ where: { campaignId: tgt } })).toBe(
            0
        );
        expect(files.copy).not.toHaveBeenCalled();
    });

    it('copies the map with chunks, version 1 and a target background path', async () => {
        files.copy.mockResolvedValue({ ok: true });

        const result = await run();

        expect(result.created).toHaveLength(1);

        const copy = await raw.battleMap.findFirstOrThrow({
            where: { campaignId: tgt },
            include: { chunks: { orderBy: { cx: 'asc' } }, versions: true },
        });

        expect(copy.id).not.toBe(mapId);
        expect(copy.mapVersion).toBe(1);
        expect(copy.versions).toHaveLength(0);
        expect(copy.chunks.map((c) => [c.cx, c.cy, c.data])).toEqual([
            [0, 0, 'AAA'],
            [1, 0, 'BBB'],
        ]);
        expect(copy.chunks[1].tileLayers).toEqual({ floor: 'x' });
        expect((copy.header as { background: string }).background).toContain(
            `/${tgt}/`
        );
    });

    it('skips the same name on a repeated run', async () => {
        const result = await run();

        expect(result.created).toEqual([]);
        expect(result.skipped).toEqual([{ name: 'Cave', reason: 'exists' }]);
    });

    it('a failed file copy leaves no row', async () => {
        await raw.battleMap.deleteMany({ where: { campaignId: tgt } });
        files.copy.mockResolvedValue({ ok: false, message: 'x' });
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await run();

        expect(result.skipped).toEqual([
            { name: 'Cave', reason: 'file-failed' },
        ]);
        expect(await raw.battleMap.count({ where: { campaignId: tgt } })).toBe(
            0
        );
    });
});
