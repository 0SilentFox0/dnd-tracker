import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => {
    const models = () => ({
        soundLibraryItem: {
            count: vi.fn(),
            findMany: vi.fn(async () => []),
            findFirst: vi.fn(),
            create: vi.fn(),
            updateMany: vi.fn(async () => ({ count: 1 })),
            deleteMany: vi.fn(async () => ({ count: 1 })),
        },
        soundPreset: {
            count: vi.fn(),
            findMany: vi.fn(async () => []),
            createMany: vi.fn(async () => ({ count: 2 })),
            update: vi.fn(async () => ({})),
        },
        userOnboardingFlag: {
            findUnique: vi.fn(async () => null),
            upsert: vi.fn(async () => ({})),
        },
        $executeRaw: vi.fn(async () => 0),
    });

    const db: Record<string, unknown> = models();

    const tx = models();

    let chain: Promise<unknown> = Promise.resolve();

    db.$transaction = vi.fn((fn: (t: unknown) => Promise<unknown>) => {
        const run = chain.then(() => fn(tx));

        chain = run.catch(() => undefined);

        return run;
    });

    return { db, tx, remove: vi.fn(), owned: vi.fn(), verify: vi.fn() };
});

vi.mock('@/lib/db', () => ({ prisma: h.db }));
vi.mock('@/lib/supabase/soundboard-storage', () => ({
    soundPathOwnedBy: h.owned,
    verifyUploadedSound: h.verify,
    removeSoundObject: h.remove,
    soundObjectPath: (url: string) => `p:${url}`,
}));

import {
    createLibrarySound,
    deleteLibrarySound,
    findPlayableFor,
    getLibrary,
} from '../library-store';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAX_LIBRARY_SOUNDS, PRESET_SLOTS } from '@/lib/constants/soundboard';

type Mocks = Record<string, ReturnType<typeof vi.fn>>;

const items = h.db.soundLibraryItem as Mocks;

const flags = h.db.userOnboardingFlag as Mocks;

const presets = h.db.soundPreset as Mocks;

const txItems = h.tx.soundLibraryItem as unknown as Mocks;

const txFlags = h.tx.userOnboardingFlag as unknown as Mocks;

const txPresets = h.tx.soundPreset as unknown as Mocks;

const txLock = () => h.tx.$executeRaw as ReturnType<typeof vi.fn>;

describe('library store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        h.owned.mockReturnValue(true);
        h.verify.mockResolvedValue({ ok: true, value: 'https://x/a.mp3' });
        items.count.mockResolvedValue(0);
        items.findMany.mockResolvedValue([]);
        flags.findUnique.mockResolvedValue(null);
        presets.findMany.mockResolvedValue([]);
        txItems.count.mockResolvedValue(0);
        txItems.findFirst.mockResolvedValue(null);
        txFlags.findUnique.mockResolvedValue(null);
        txPresets.findMany.mockResolvedValue([]);
    });

    it('seeds starter presets when the account has none', async () => {
        txPresets.count.mockResolvedValue(0);

        await getLibrary('u1');

        const data = txPresets.createMany.mock.calls[0][0].data;

        expect(data).toHaveLength(2);
        expect(data[0].slots).toHaveLength(PRESET_SLOTS);
        expect(data[0].slots.every((s: unknown) => s !== null)).toBe(true);
        expect(data[1].slots).toHaveLength(PRESET_SLOTS);
        expect(data[1].slots.at(-1)).toBeNull();
        expect(presets.createMany).not.toHaveBeenCalled();
        expect(txFlags.upsert).toHaveBeenCalledTimes(1);
        expect(
            JSON.stringify(txLock().mock.calls[0])
        ).toContain('sound-presets:u1');
    });

    it('skips the lock and the seed once the marker exists', async () => {
        flags.findUnique.mockResolvedValue({ id: 'f1' });

        await getLibrary('u1');

        expect(h.db.$transaction).not.toHaveBeenCalled();
        expect(txLock()).not.toHaveBeenCalled();
        expect(txPresets.createMany).not.toHaveBeenCalled();
    });

    it('marks an account that already has presets without reseeding', async () => {
        txPresets.count.mockResolvedValue(3);

        await getLibrary('u1');

        expect(txPresets.createMany).not.toHaveBeenCalled();
        expect(txFlags.upsert).toHaveBeenCalledTimes(1);
    });

    it('seeds once for two parallel first reads', async () => {
        let marker = false;

        let stored = 0;

        flags.findUnique.mockImplementation(async () =>
            marker ? { id: 'f' } : null
        );
        txFlags.findUnique.mockImplementation(async () =>
            marker ? { id: 'f' } : null
        );
        txPresets.count.mockImplementation(async () => stored);
        txPresets.createMany.mockImplementation(async () => {
            await new Promise((r) => setTimeout(r, 5));
            stored = 2;

            return { count: 2 };
        });
        txFlags.upsert.mockImplementation(async () => {
            marker = true;

            return {};
        });

        await Promise.all([getLibrary('u1'), getLibrary('u1')]);

        expect(txPresets.createMany).toHaveBeenCalledTimes(1);
        expect(txFlags.upsert).toHaveBeenCalledTimes(1);
    });

    it('nulls the deleted sound under the lock, through the transaction', async () => {
        items.findFirst.mockResolvedValue({ id: 's1', url: 'https://x/a.mp3' });
        txPresets.findMany.mockResolvedValue([
            { id: 'p1', slots: ['s1', null, 's2'] },
            { id: 'p2', slots: ['s2'] },
            { id: 'p3', slots: ['s1', 's1'] },
        ]);

        await deleteLibrarySound('u1', 's1');

        expect(txLock()).toHaveBeenCalledTimes(1);
        expect(presets.update).not.toHaveBeenCalled();
        expect(items.deleteMany).not.toHaveBeenCalled();
        expect(txPresets.update).toHaveBeenCalledTimes(2);
        expect(txPresets.update.mock.calls[0][0]).toEqual({
            where: { id: 'p1' },
            data: { slots: [null, null, 's2'] },
        });
        expect(txPresets.update.mock.calls[1][0].data.slots).toEqual([
            null,
            null,
        ]);
        expect(txItems.deleteMany).toHaveBeenCalledWith({
            where: { id: 's1', userId: 'u1' },
        });
        expect(h.remove).toHaveBeenCalledWith('p:https://x/a.mp3');
    });

    it('rejects the 101st sound', async () => {
        items.count.mockResolvedValue(MAX_LIBRARY_SOUNDS);

        await expect(
            createLibrarySound('u1', {
                path: 'u1/a.mp3',
                durationMs: 500,
                source: 'upload',
            })
        ).rejects.toMatchObject({
            message: API_ERRORS.SOUND_LIMIT,
            status: 400,
        });
        expect(txItems.create).not.toHaveBeenCalled();
    });

    it('re-checks the limit under the lock and creates through the transaction', async () => {
        txItems.count.mockResolvedValue(MAX_LIBRARY_SOUNDS);

        await expect(
            createLibrarySound('u1', {
                path: 'u1/a.mp3',
                durationMs: 500,
                source: 'upload',
            })
        ).rejects.toMatchObject({ message: API_ERRORS.SOUND_LIMIT });
        expect(txLock()).toHaveBeenCalledTimes(1);
        expect(txItems.create).not.toHaveBeenCalled();
    });

    it('creates the row inside the transaction', async () => {
        txItems.create.mockResolvedValue({
            id: 'n1',
            url: 'https://x/a.mp3',
        });

        await createLibrarySound('u1', {
            path: 'u1/a.mp3',
            durationMs: 500,
            source: 'upload',
        });

        expect(txItems.create).toHaveBeenCalledTimes(1);
        expect(items.create).not.toHaveBeenCalled();
    });

    it('rejects a second row for the same stored url', async () => {
        txItems.findFirst.mockResolvedValue({ id: 'old' });

        await expect(
            createLibrarySound('u1', {
                path: 'u1/a.mp3',
                durationMs: 500,
                source: 'upload',
            })
        ).rejects.toMatchObject({
            message: API_ERRORS.TRACK_DUPLICATE,
            status: 409,
        });
        expect(txItems.findFirst.mock.calls[0][0].where).toEqual({
            userId: 'u1',
            url: 'https://x/a.mp3',
        });
        expect(txItems.create).not.toHaveBeenCalled();
    });

    it('findPlayableFor hides other users sounds and resolves builtin', async () => {
        items.findFirst.mockResolvedValue(null);

        expect(await findPlayableFor('u1', 'foreign')).toBeNull();
        expect(items.findFirst.mock.calls[0][0].where).toEqual({
            id: 'foreign',
            userId: 'u1',
        });
        expect(await findPlayableFor('u1', 'builtin:thunder')).toEqual({
            volume: 1,
            url: '/sfx/thunder.mp3',
        });
        expect(await findPlayableFor('u1', 'builtin:nope')).toBeNull();
    });
});
