import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = { level: number; race: string; skillTreeProgress: unknown };

const world = vi.hoisted(() => ({
    characters: new Map<string, Row & { id: string }>(),
    table: new Map<string, { progress: unknown; version: number }>(),
}));

const db = vi.hoisted(() => {
    const mock = {
        character: {
            findMany: vi.fn(
                async ({
                    where,
                }: {
                    where: { race?: string; id?: { in: string[] } };
                }) =>
                    [...world.characters.values()].filter((c) =>
                        where.id
                            ? where.id.in.includes(c.id)
                            : c.race === where.race
                    )
            ),
            findUnique: vi.fn(
                async ({ where }: { where: { id: string } }) =>
                    world.characters.get(where.id) ?? null
            ),
            update: vi.fn(
                async ({
                    where,
                    data,
                }: {
                    where: { id: string };
                    data: Partial<Row>;
                }) => {
                    Object.assign(world.characters.get(where.id)!, data);
                }
            ),
        },
        skillTreeProgress: {
            findMany: vi.fn(
                async ({
                    where,
                }: {
                    where: { characterId: { in: string[] } };
                }) =>
                    where.characterId.in.flatMap((characterId) => {
                        const r = world.table.get(characterId);

                        return r ? [{ characterId, ...r }] : [];
                    })
            ),
            findUnique: vi.fn(
                async ({ where }: { where: { characterId: string } }) =>
                    world.table.get(where.characterId) ?? null
            ),
            upsert: vi.fn(
                async ({
                    where,
                    create,
                    update,
                }: {
                    where: { characterId: string };
                    create: { progress: unknown; version: number };
                    update: { progress: unknown };
                }) => {
                    const cur = world.table.get(where.characterId);

                    world.table.set(
                        where.characterId,
                        cur
                            ? {
                                  progress: update.progress,
                                  version: cur.version + 1,
                              }
                            : {
                                  progress: create.progress,
                                  version: create.version,
                              }
                    );
                }
            ),
            createMany: vi.fn(
                async ({
                    data,
                }: {
                    data: {
                        characterId: string;
                        progress: unknown;
                        version: number;
                    }[];
                }) => {
                    let count = 0;

                    for (const d of data) {
                        if (world.table.has(d.characterId)) continue;

                        world.table.set(d.characterId, {
                            progress: d.progress,
                            version: d.version,
                        });
                        count++;
                    }

                    return { count };
                }
            ),
            updateMany: vi.fn(
                async ({
                    where,
                    data,
                }: {
                    where: { characterId: string; version: number };
                    data: { progress: unknown };
                }) => {
                    const cur = world.table.get(where.characterId);

                    if (!cur || cur.version !== where.version)
                        return { count: 0 };

                    world.table.set(where.characterId, {
                        progress: data.progress,
                        version: cur.version + 1,
                    });

                    return { count: 1 };
                }
            ),
        },
    };

    return mock;
});

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: db }));

import {
    readProgress,
    resetProgress,
} from '@/systems/skilltrees/server/progress-store';
import { moveSkillTreeProgress } from '@/systems/skilltrees/server/service/progress-move';

const seed = () => {
    world.characters.clear();
    world.table.clear();

    for (const id of ['a', 'b', 'c'])
        world.characters.set(id, {
            id,
            level: 5,
            race: id === 'c' ? 'Orc' : 'Elf',
            skillTreeProgress: { old: { unlockedSkills: [id] } },
        });

    world.table.set('a', {
        progress: { old: { unlockedSkills: ['a'] } },
        version: 1,
    });
};

describe('skill tree progress is never lost across heroes', () => {
    beforeEach(seed);

    it('a level-down reset of one hero leaves every other hero untouched', async () => {
        await resetProgress(db as never, 'a');

        const map = await readProgress(['a', 'b', 'c'], db as never);

        expect(map.get('a')).toEqual({});
        expect(world.characters.get('a')?.skillTreeProgress).toEqual({});
        expect(map.get('b')).toEqual({ old: { unlockedSkills: ['b'] } });
        expect(map.get('c')).toEqual({ old: { unlockedSkills: ['c'] } });
        expect(world.table.has('b')).toBe(false);
    });

    it('a reset of a column-only hero creates the table row and clears the column', async () => {
        await resetProgress(db as never, 'b');

        expect(world.table.get('b')).toEqual({ progress: {}, version: 1 });
        expect(world.characters.get('b')?.skillTreeProgress).toEqual({});
    });

    it('moving the tree key rewrites table and column for that race only', async () => {
        await moveSkillTreeProgress(db as never, 'camp', 'Elf', 'old', 'new');

        for (const id of ['a', 'b']) {
            const moved = { new: { unlockedSkills: [id] } };

            expect((await readProgress([id], db as never)).get(id)).toEqual(
                moved
            );
            expect(world.characters.get(id)?.skillTreeProgress).toEqual(moved);
        }

        expect(world.characters.get('c')?.skillTreeProgress).toEqual({
            old: { unlockedSkills: ['c'] },
        });
        expect(world.table.has('c')).toBe(false);
    });

    it('moving again is a no-op and does not bump versions', async () => {
        await moveSkillTreeProgress(db as never, 'camp', 'Elf', 'old', 'new');

        const version = world.table.get('a')?.version;

        await moveSkillTreeProgress(db as never, 'camp', 'Elf', 'old', 'new');

        expect(world.table.get('a')?.version).toBe(version);
    });

    it('a concurrent write between attempts is merged, not overwritten', async () => {
        const original =
            db.skillTreeProgress.updateMany.getMockImplementation();

        let bumped = false;

        db.skillTreeProgress.updateMany.mockImplementation(async (args) => {
            if (!bumped) {
                bumped = true;
                world.table.set('a', {
                    progress: { old: { unlockedSkills: ['a', 'x'] } },
                    version: 2,
                });
            }

            return original!(args);
        });

        await moveSkillTreeProgress(db as never, 'camp', 'Elf', 'old', 'new');

        expect(world.table.get('a')?.progress).toEqual({
            new: { unlockedSkills: ['a', 'x'] },
        });
    });
});
