import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const files = vi.hoisted(() => ({ copy: vi.fn(), remove: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
    unstable_cache: (fn: unknown) => fn,
    revalidateTag: vi.fn(),
}));
vi.mock('@/lib/supabase/copy-object', () => ({
    copyStorageObject: files.copy,
}));
vi.mock('@/lib/supabase/battle-music-storage', () => ({
    removeTrackFile: files.remove,
    trackObjectPath: (url: string) =>
        url.includes('/battle-music/')
            ? url.slice(url.indexOf('/battle-music/') + 14)
            : null,
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

const marker = `cptrk-${randomUUID()}`;

const [src, tgt, bad] = ['src', 'tgt', 'bad'].map((s) => `${marker}-${s}`);

const cuid = () => `c${randomUUID().replaceAll('-', '').slice(0, 24)}`;

const [fileId, ytId] = [cuid(), cuid()];

const FILE_URL = `https://x.test/storage/battle-music/${src}/${'a'.repeat(32)}.mp3`;

const copy = (campaignId: string) =>
    copyContent({
        actor: sessionDmActor(src, marker),
        items: [{ kind: 'tracks', ids: [fileId, ytId] }],
        targets: { campaignIds: [campaignId] },
    });

describe.skipIf(!isLocalDevDatabaseEnv())('copy tracks (local DB)', () => {
    beforeAll(async () => {
        await raw.user.create({
            data: {
                id: marker,
                email: `${marker}@example.invalid`,
                displayName: marker,
            },
        });

        for (const cid of [src, tgt, bad]) {
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
            await raw.campaignMember.create({
                data: { campaignId: cid, userId: marker, role: 'dm' } as never,
            });
        }

        await raw.campaignTrack.createMany({
            data: [
                {
                    id: fileId,
                    campaignId: src,
                    title: 'Theme',
                    kind: 'file',
                    url: FILE_URL,
                },
                {
                    id: ytId,
                    campaignId: src,
                    title: 'Yt',
                    kind: 'youtube',
                    youtubeId: 'abc',
                },
            ],
        });
    });

    afterAll(async () => {
        await raw.campaignTrack.deleteMany({
            where: { campaignId: { in: [src, tgt, bad] } },
        });
        await raw.campaignMember.deleteMany({
            where: { campaignId: { in: [src, tgt, bad] } },
        });
        await raw.campaign.deleteMany({
            where: { id: { in: [src, tgt, bad] } },
        });
        await raw.user.delete({ where: { id: marker } });
        await raw.$disconnect();
    });

    it('copies the file into the target prefix and creates both rows', async () => {
        files.copy.mockResolvedValue({ ok: true });

        const { targets } = await copy(tgt);

        expect(targets[0].status).toBe('ok');

        const rows = await raw.campaignTrack.findMany({
            where: { campaignId: tgt },
            orderBy: { title: 'asc' },
        });

        expect(rows.map((r) => r.title)).toEqual(['Theme', 'Yt']);
        expect(rows[0].url).toMatch(
            new RegExp(`/battle-music/${tgt}/[a-f0-9]{32}\\.mp3$`)
        );
        expect(rows[0].url).not.toBe(FILE_URL);
        expect(files.copy).toHaveBeenCalledTimes(1);
    });

    it('a repeated copy creates nothing and copies no file', async () => {
        files.copy.mockClear();

        const { targets } = await copy(tgt);

        expect(targets[0].created).toEqual([]);
        expect(files.copy).not.toHaveBeenCalled();
        expect(await raw.campaignTrack.count({ where: { campaignId: tgt } })).toBe(
            2
        );
    });

    it('concurrent copies do not duplicate names', async () => {
        await raw.campaignTrack.deleteMany({ where: { campaignId: tgt } });
        files.copy.mockResolvedValue({ ok: true });

        await Promise.all([copy(tgt), copy(tgt)]);

        expect(await raw.campaignTrack.count({ where: { campaignId: tgt } })).toBe(
            2
        );
    });

    it('removes the copied file when the target transaction fails', async () => {
        files.copy.mockResolvedValue({ ok: true });
        files.remove.mockClear();
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const { targets } = await copy(bad);

        expect(targets[0].status).toBe('failed');
        expect(files.remove).toHaveBeenCalledTimes(1);
        expect(files.remove.mock.calls[0][0]).toContain(`/${bad}/`);
        expect(await raw.campaignTrack.count({ where: { campaignId: bad } })).toBe(
            0
        );
    });
});
