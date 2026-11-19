import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => {
    const db: Record<string, unknown> = {
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
        $executeRaw: vi.fn(async () => 0),
    };

    db.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(db));

    return { db, remove: vi.fn(), owned: vi.fn(), verify: vi.fn() };
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

const items = h.db.soundLibraryItem as Record<string, ReturnType<typeof vi.fn>>;

const presets = h.db.soundPreset as Record<string, ReturnType<typeof vi.fn>>;

describe('library store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        h.owned.mockReturnValue(true);
        h.verify.mockResolvedValue({ ok: true, value: 'https://x/a.mp3' });
        items.count.mockResolvedValue(0);
        items.findMany.mockResolvedValue([]);
        presets.findMany.mockResolvedValue([]);
    });

    it('seeds starter presets when the account has none', async () => {
        presets.count.mockResolvedValue(0);

        await getLibrary('u1');

        const data = presets.createMany.mock.calls[0][0].data;

        expect(data).toHaveLength(2);
        expect(data[0].slots).toHaveLength(PRESET_SLOTS);
        expect(data[0].slots.every((s: unknown) => s !== null)).toBe(true);
        expect(data[1].slots).toHaveLength(PRESET_SLOTS);
        expect(data[1].slots.at(-1)).toBeNull();
        expect(h.db.$executeRaw).toHaveBeenCalled();
    });

    it('does not seed twice', async () => {
        presets.count.mockResolvedValue(2);

        await getLibrary('u1');

        expect(presets.createMany).not.toHaveBeenCalled();
    });

    it('nulls the deleted sound in every preset and removes the object', async () => {
        items.findFirst.mockResolvedValue({ id: 's1', url: 'https://x/a.mp3' });
        presets.findMany.mockResolvedValue([
            { id: 'p1', slots: ['s1', null, 's2'] },
            { id: 'p2', slots: ['s2'] },
            { id: 'p3', slots: ['s1', 's1'] },
        ]);

        await deleteLibrarySound('u1', 's1');

        expect(presets.update).toHaveBeenCalledTimes(2);
        expect(presets.update.mock.calls[0][0]).toEqual({
            where: { id: 'p1' },
            data: { slots: [null, null, 's2'] },
        });
        expect(presets.update.mock.calls[1][0].data.slots).toEqual([
            null,
            null,
        ]);
        expect(items.deleteMany).toHaveBeenCalledWith({
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
        expect(items.create).not.toHaveBeenCalled();
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
