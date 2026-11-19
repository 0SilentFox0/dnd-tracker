import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => ({
    db: {
        campaignSound: {
            count: vi.fn(),
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(async () => ({ count: 1 })),
            deleteMany: vi.fn(async () => ({ count: 1 })),
            aggregate: vi.fn(),
        },
        campaign: { findUnique: vi.fn(), update: vi.fn() },
        $transaction: vi.fn(async (ops: unknown[]) => ops),
    },
    owned: vi.fn(),
    verify: vi.fn(),
    remove: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: h.db }));
vi.mock('@/lib/supabase/soundboard-storage', () => ({
    soundPathOwnedBy: h.owned,
    verifyUploadedSound: h.verify,
    removeSoundObject: h.remove,
    soundObjectPath: (url: string) => `p:${url}`,
}));

import {
    createSound,
    deleteSound,
    findPlayable,
    reorderSounds,
    setHiddenBuiltin,
    soundsEtag,
    updateSound,
} from '../sound-store';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAX_SOUNDS_PER_CAMPAIGN } from '@/lib/constants/soundboard';

const row = {
    id: 's1',
    campaignId: 'c1',
    name: 'Boom',
    url: 'https://x/boom.mp3',
    durationMs: 900,
    volume: 0.5,
    color: null,
    icon: null,
    sortOrder: 2,
    createdAt: new Date('2026-01-01T00:00:00Z'),
};

describe('soundboard store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        h.owned.mockReturnValue(true);
        h.verify.mockResolvedValue({ ok: true, value: row.url });
        h.db.campaignSound.count.mockResolvedValue(0);
        h.db.campaignSound.aggregate.mockResolvedValue({
            _max: { sortOrder: 1 },
        });
        h.db.campaignSound.create.mockResolvedValue(row);
        h.db.campaignSound.findFirst.mockResolvedValue(null);
    });

    it('rejects creation at the limit', async () => {
        h.db.campaignSound.count.mockResolvedValue(MAX_SOUNDS_PER_CAMPAIGN);

        await expect(
            createSound('c1', { path: 'c1/a.mp3', name: 'Boom' })
        ).rejects.toMatchObject({
            message: API_ERRORS.SOUND_LIMIT,
            status: 400,
        });
        expect(h.db.campaignSound.create).not.toHaveBeenCalled();
    });

    it('rejects a path owned by another campaign', async () => {
        h.owned.mockReturnValue(false);

        await expect(
            createSound('c1', { path: 'c2/a.mp3', name: 'Boom' })
        ).rejects.toMatchObject({ message: API_ERRORS.FORBIDDEN, status: 403 });
        expect(h.verify).not.toHaveBeenCalled();
    });

    it('rejects an invalid stored object', async () => {
        h.verify.mockResolvedValue({
            ok: false,
            message: API_ERRORS.SOUND_FILE_INVALID,
        });

        await expect(
            createSound('c1', { path: 'c1/a.mp3', name: 'Boom' })
        ).rejects.toMatchObject({ message: API_ERRORS.SOUND_FILE_INVALID });
    });

    it('creates a sound after the last one', async () => {
        const sound = await createSound('c1', {
            path: 'c1/a.mp3',
            name: 'Boom',
        });

        expect(h.db.campaignSound.create.mock.calls[0][0].data).toMatchObject({
            campaignId: 'c1',
            url: row.url,
            sortOrder: 2,
        });
        expect(sound).toMatchObject({
            id: 's1',
            source: 'custom',
            volume: 0.5,
        });
    });

    it('deletes the row and the stored object', async () => {
        h.db.campaignSound.findFirst.mockResolvedValue(row);

        await deleteSound('c1', 's1');

        expect(h.db.campaignSound.deleteMany).toHaveBeenCalledWith({
            where: { id: 's1', campaignId: 'c1' },
        });
        expect(h.remove).toHaveBeenCalledWith(`p:${row.url}`);
    });

    it('answers 404 when deleting a foreign sound', async () => {
        h.db.campaignSound.findFirst.mockResolvedValue(null);

        await expect(deleteSound('c1', 'zz')).rejects.toMatchObject({
            message: API_ERRORS.SOUND_NOT_FOUND,
            status: 404,
        });
    });

    it('findPlayable hides hidden builtins', async () => {
        h.db.campaign.findUnique.mockResolvedValue({
            hiddenBuiltinSounds: ['builtin:thunder'],
        });

        expect(await findPlayable('c1', 'builtin:thunder')).toBeNull();
        expect(await findPlayable('c1', 'builtin:bell')).toEqual({ volume: 1 });
    });

    it('findPlayable returns the custom volume or null', async () => {
        h.db.campaignSound.findFirst.mockResolvedValueOnce(row);
        h.db.campaignSound.findFirst.mockResolvedValueOnce(null);

        expect(await findPlayable('c1', 's1')).toEqual({ volume: 0.5 });
        expect(await findPlayable('c1', 'nope')).toBeNull();
    });

    it('reorders within the campaign', async () => {
        await reorderSounds('c1', ['b', 'a']);

        expect(h.db.campaignSound.updateMany).toHaveBeenCalledWith({
            where: { id: 'a', campaignId: 'c1' },
            data: { sortOrder: 1 },
        });
    });

    it('setHiddenBuiltin stores the ids', async () => {
        await setHiddenBuiltin('c1', ['builtin:bell']);

        expect(h.db.campaign.update).toHaveBeenCalledWith({
            where: { id: 'c1' },
            data: { hiddenBuiltinSounds: ['builtin:bell'] },
        });
    });

    it('rejects registering the same stored object twice', async () => {
        h.db.campaignSound.findFirst.mockResolvedValue(row);

        await expect(
            createSound('c1', { path: 'c1/a.mp3', name: 'Boom' })
        ).rejects.toMatchObject({
            message: API_ERRORS.SOUND_FILE_INVALID,
            status: 400,
        });
        expect(h.db.campaignSound.create).not.toHaveBeenCalled();
    });

    it('updates within the campaign', async () => {
        h.db.campaignSound.findFirst
            .mockResolvedValueOnce(row)
            .mockResolvedValueOnce({ ...row, name: 'New' });

        const sound = await updateSound('c1', 's1', { name: 'New' });

        expect(h.db.campaignSound.updateMany).toHaveBeenCalledWith({
            where: { id: 's1', campaignId: 'c1' },
            data: { name: 'New' },
        });
        expect(sound.name).toBe('New');
    });
});

describe('soundsEtag', () => {
    const list = {
        sounds: [
            { ...toCustom('a'), name: 'A' },
            { ...toCustom('b'), name: 'B' },
        ],
        hiddenBuiltin: ['builtin:x', 'builtin:y'],
    };

    it('is stable for an identical list', () => {
        expect(soundsEtag(structuredClone(list))).toBe(soundsEtag(list));
    });

    it('changes with name, volume, order and hidden swap', () => {
        const base = soundsEtag(list);

        const renamed = structuredClone(list);

        renamed.sounds[0].name = 'Z';

        const louder = structuredClone(list);

        louder.sounds[0].volume = 0.1;

        const reordered = {
            ...list,
            sounds: [list.sounds[1], list.sounds[0]],
        };

        const swapped = { ...list, hiddenBuiltin: ['builtin:x', 'builtin:z'] };

        const tags = [renamed, louder, reordered, swapped].map(soundsEtag);

        expect(new Set([base, ...tags]).size).toBe(5);
    });

    it('ignores hidden order', () => {
        expect(
            soundsEtag({ ...list, hiddenBuiltin: ['builtin:y', 'builtin:x'] })
        ).toBe(soundsEtag(list));
    });
});

function toCustom(id: string) {
    return {
        id,
        name: id,
        url: `https://x/${id}.mp3`,
        volume: 0.5,
        color: null,
        icon: null,
        sortOrder: 0,
        durationMs: null,
    };
}
