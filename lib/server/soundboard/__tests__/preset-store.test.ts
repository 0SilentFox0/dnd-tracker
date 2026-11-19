import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => {
    const tx = {
        soundLibraryItem: { findMany: vi.fn() },
        soundPreset: {
            count: vi.fn(),
            create: vi.fn(),
            aggregate: vi.fn(),
            updateMany: vi.fn(async (_args?: unknown) => ({ count: 1 })),
        },
        $executeRaw: vi.fn(async () => 0),
    };

    const db = {
        soundLibraryItem: { findMany: vi.fn() },
        soundPreset: {
            findFirst: vi.fn(),
            updateMany: vi.fn(async (_args?: unknown) => ({ count: 1 })),
            deleteMany: vi.fn(async () => ({ count: 1 })),
        },
        $transaction: vi.fn(async (arg: unknown) =>
            typeof arg === 'function'
                ? (arg as (t: unknown) => unknown)(tx)
                : arg
        ),
    };

    return { db, tx };
});

vi.mock('@/lib/db', () => ({ prisma: h.db }));
vi.mock('@/lib/supabase/soundboard-storage', () => ({}));

import {
    createPreset,
    deletePreset,
    reorderPresets,
    updatePreset,
} from '../preset-store';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAX_PRESETS, PRESET_SLOTS } from '@/lib/constants/soundboard';

const preset = h.db.soundPreset;

const txPreset = h.tx.soundPreset;

const row = {
    id: 'p1',
    name: 'N',
    slots: Array(PRESET_SLOTS).fill(null),
    sortOrder: 0,
};

const nine = (id: string | null) => Array(PRESET_SLOTS).fill(id);

describe('preset store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        preset.findFirst.mockResolvedValue(row);
        txPreset.count.mockResolvedValue(0);
        txPreset.aggregate.mockResolvedValue({ _max: { sortOrder: 1 } });
        txPreset.create.mockResolvedValue(row);
        h.tx.soundLibraryItem.findMany.mockResolvedValue([]);
    });

    it('rejects a foreign sound id and writes nothing', async () => {
        await expect(
            updatePreset('u1', 'p1', { slots: nine('other-user-sound') })
        ).rejects.toMatchObject({
            message: API_ERRORS.PRESET_SLOT_INVALID,
            status: 400,
        });
        expect(txPreset.updateMany).not.toHaveBeenCalled();
    });

    it('rejects an unknown builtin id', async () => {
        await expect(
            updatePreset('u1', 'p1', { slots: nine('builtin:x') })
        ).rejects.toMatchObject({ message: API_ERRORS.PRESET_SLOT_INVALID });
        expect(txPreset.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a slot count other than 9', async () => {
        await expect(
            updatePreset('u1', 'p1', { slots: [null] })
        ).rejects.toMatchObject({ message: API_ERRORS.PRESET_SLOT_INVALID });
    });

    it('saves 9 valid slots', async () => {
        h.tx.soundLibraryItem.findMany.mockResolvedValue([{ id: 'mine' }]);

        const slots = [...nine('mine').slice(0, 8), 'builtin:thunder'];

        await updatePreset('u1', 'p1', { slots });

        expect(txPreset.updateMany).toHaveBeenCalledWith({
            where: { id: 'p1', userId: 'u1' },
            data: { name: undefined, slots },
        });
        expect(h.tx.$executeRaw).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(h.tx.$executeRaw.mock.calls[0])).toContain(
            'sound-presets:u1'
        );
        expect(h.db.soundLibraryItem.findMany).not.toHaveBeenCalled();
    });

    it('rejects the 31st preset', async () => {
        txPreset.count.mockResolvedValue(MAX_PRESETS);

        await expect(createPreset('u1', 'X')).rejects.toMatchObject({
            message: API_ERRORS.PRESET_LIMIT,
            status: 400,
        });
        expect(txPreset.create).not.toHaveBeenCalled();
    });

    it('creates an empty preset after the last one', async () => {
        await createPreset('u1', 'X');

        expect(txPreset.create.mock.calls[0][0].data).toMatchObject({
            userId: 'u1',
            name: 'X',
            sortOrder: 2,
        });
        expect(h.tx.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('404s on another users preset for delete', async () => {
        preset.findFirst.mockResolvedValue(null);

        await expect(deletePreset('u1', 'p9')).rejects.toMatchObject({
            message: API_ERRORS.PRESET_NOT_FOUND,
            status: 404,
        });
    });

    it('reorders scoped to the user', async () => {
        await reorderPresets('u1', ['b', 'a']);

        expect(preset.updateMany.mock.calls[1][0]).toEqual({
            where: { id: 'a', userId: 'u1' },
            data: { sortOrder: 1 },
        });
    });
});
