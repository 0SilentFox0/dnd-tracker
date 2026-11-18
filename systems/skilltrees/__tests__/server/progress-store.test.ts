import { describe, expect, it, vi } from 'vitest';

import {
    ProgressVersionConflictError,
    readProgress,
    writeProgress,
} from '@/systems/skilltrees/server/progress-store';

function makeDb(
    rows: { characterId: string; progress: unknown }[],
    columns: { id: string; skillTreeProgress: unknown }[]
) {
    return {
        skillTreeProgress: {
            findMany: vi.fn().mockResolvedValue(rows),
            upsert: vi.fn().mockResolvedValue({}),
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        character: {
            findMany: vi.fn().mockResolvedValue(columns),
            update: vi.fn().mockResolvedValue({}),
        },
    };
}

describe('readProgress', () => {
    it('prefers the table and falls back to the column', async () => {
        const db = makeDb(
            [{ characterId: 'a', progress: { t: ['x'] } }],
            [
                { id: 'a', skillTreeProgress: { t: ['old'] } },
                { id: 'b', skillTreeProgress: { t: ['col'] } },
            ]
        );

        const map = await readProgress(['a', 'b'], db as never);

        expect(map.get('a')).toEqual({ t: ['x'] });
        expect(map.get('b')).toEqual({ t: ['col'] });
    });

    it('returns an empty map without querying for no ids', async () => {
        const db = makeDb([], []);

        expect((await readProgress([], db as never)).size).toBe(0);
        expect(db.character.findMany).not.toHaveBeenCalled();
    });
});

describe('writeProgress', () => {
    it('upserts the table and writes the legacy column', async () => {
        const db = makeDb([], []);

        await writeProgress(db as never, 'a', { t: [] });

        expect(db.skillTreeProgress.upsert).toHaveBeenCalledOnce();
        expect(db.character.update).toHaveBeenCalledWith({
            where: { id: 'a' },
            data: { skillTreeProgress: { t: [] } },
        });
    });

    it('compares and swaps on the expected version', async () => {
        const db = makeDb([], []);

        await writeProgress(db as never, 'a', {}, { expectedVersion: 3 });

        expect(db.skillTreeProgress.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { characterId: 'a', version: 3 },
            })
        );
    });

    it('throws a typed conflict when the version moved and skips the column', async () => {
        const db = makeDb([], []);

        db.skillTreeProgress.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            writeProgress(db as never, 'a', {}, { expectedVersion: 3 })
        ).rejects.toBeInstanceOf(ProgressVersionConflictError);
        expect(db.character.update).not.toHaveBeenCalled();
    });

    it('maps a skipped duplicate insert at expectedVersion 0 to a conflict', async () => {
        const db = makeDb([], []);

        db.skillTreeProgress.createMany.mockResolvedValue({ count: 0 });

        await expect(
            writeProgress(db as never, 'a', {}, { expectedVersion: 0 })
        ).rejects.toBeInstanceOf(ProgressVersionConflictError);
        expect(db.character.update).not.toHaveBeenCalled();
    });
});
