import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
    const mock = {
        character: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            updateMany: vi.fn(),
            update: vi.fn(),
        },
        skillTree: { findFirst: vi.fn() },
        skillTreeProgress: {
            findUnique: vi.fn(),
            createMany: vi.fn(),
            updateMany: vi.fn(),
        },
        $transaction: vi.fn(),
    };

    mock.$transaction.mockImplementation(async (fn) => fn(mock));

    return mock;
});

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: db }));

import { API_ERRORS } from '@/lib/constants/api-errors';
import type { CampaignAccessResult } from '@/lib/utils/api/api-auth';
import { buildTreeJson } from '@/lib/utils/skills/progression';
import { runProgressionAction } from '@/systems/skilltrees/server/progression/actions';

const treeRow = {
    id: 'row',
    campaignId: 'camp',
    race: 'Elf',
    skills: buildTreeJson({
        id: 'json',
        race: 'Elf',
        branches: [
            { id: 'attack', name: 'Attack', color: 'red', outer: ['o1'] },
        ],
    }),
};

const character = (over: object = {}) => ({
    id: 'ch',
    level: 3,
    race: 'Elf',
    seenLevel: 3,
    controlledBy: 'owner',
    ...over,
});

let stored: unknown = {};

const asUser = (userId: string, isDM = false) =>
    ({ userId, isDM }) as unknown as CampaignAccessResult;

const run = (
    access: CampaignAccessResult,
    action: Parameters<typeof runProgressionAction>[3]
) => runProgressionAction(access, 'camp', 'ch', action);

const tableWrite = () => {
    const [{ where, data }] = db.skillTreeProgress.updateMany.mock.calls[0];

    return { characterId: where.characterId, ...data };
};

describe('runProgressionAction', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        stored = {};
        db.$transaction.mockImplementation(async (fn) => fn(db));
        db.character.findFirst.mockResolvedValue(character());
        db.skillTreeProgress.findUnique.mockImplementation(async () => ({
            progress: stored,
            version: 1,
        }));
        db.skillTree.findFirst.mockResolvedValue(treeRow);
        db.character.updateMany.mockResolvedValue({ count: 1 });
        db.character.update.mockResolvedValue({});
        db.skillTreeProgress.updateMany.mockResolvedValue({ count: 1 });
    });

    it('404 for a character of another campaign', async () => {
        db.character.findFirst.mockResolvedValue(null);

        const res = await run(asUser('owner'), {
            type: 'learn',
            nodeId: 'attack_basic_level',
        });

        expect(res.status).toBe(404);
        expect(db.character.update).not.toHaveBeenCalled();
    });

    it('403 for a player who neither owns the character nor is DM', async () => {
        const res = await run(asUser('stranger'), {
            type: 'learn',
            nodeId: 'attack_basic_level',
        });

        expect(res.status).toBe(403);
        expect(await res.json()).toMatchObject({ error: API_ERRORS.FORBIDDEN });
    });

    it('the owner learns a node and the new list is stored under the tree', async () => {
        const res = await run(asUser('owner'), {
            type: 'learn',
            nodeId: 'attack_basic_level',
        });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ unlocked: ['attack_basic_level'] });

        const progress = {
            row: { unlockedSkills: ['attack_basic_level'] },
        };

        expect(tableWrite()).toMatchObject({ characterId: 'ch', progress });
        expect(db.character.update).not.toHaveBeenCalled();
    });

    it('a blocked learn answers 422 with the reason and writes nothing', async () => {
        const res = await run(asUser('owner'), {
            type: 'learn',
            nodeId: 'ghost',
        });

        expect(res.status).toBe(422);
        expect(await res.json()).toEqual({ reason: 'notInTree' });
        expect(db.character.update).not.toHaveBeenCalled();
    });

    it('no points left blocks learning', async () => {
        db.character.findFirst.mockResolvedValue(character({ level: 1 }));
        stored = { row: { unlockedSkills: ['attack_basic_level'] } };

        const res = await run(asUser('owner'), { type: 'learn', nodeId: 'o1' });

        expect(res.status).toBe(422);
        expect(await res.json()).toEqual({ reason: 'noPoints' });
    });

    it('learning needs a race tree: 404 without one', async () => {
        db.skillTree.findFirst.mockResolvedValue(null);

        const res = await run(asUser('owner'), {
            type: 'learn',
            nodeId: 'attack_basic_level',
        });

        expect(res.status).toBe(404);
        expect(await res.json()).toMatchObject({
            error: API_ERRORS.CHARACTER_RACE_TREE_MISSING,
        });
    });

    it('unlearn and reset are DM-only', async () => {
        const actions: Parameters<typeof runProgressionAction>[3][] = [
            { type: 'unlearn', nodeIds: ['x'] },
            { type: 'reset' },
        ];

        for (const action of actions) {
            const res = await run(asUser('owner'), action);

            expect(res.status).toBe(403);
        }

        expect(db.character.update).not.toHaveBeenCalled();
    });

    it('the DM unlearns a learned node', async () => {
        stored = { row: { unlockedSkills: ['attack_basic_level'] } };

        const res = await run(asUser('dm', true), {
            type: 'unlearn',
            nodeIds: ['attack_basic_level'],
        });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ unlocked: [] });
        expect(tableWrite()).toMatchObject({ characterId: 'ch' });
        expect(db.character.update).not.toHaveBeenCalled();
    });

    it('unlearning a node that was not learned answers 422', async () => {
        const res = await run(asUser('dm', true), {
            type: 'unlearn',
            nodeIds: ['attack_basic_level'],
        });

        expect(res.status).toBe(422);
        expect(await res.json()).toEqual({ reason: 'notLearned' });
    });

    it('the DM resets progress without needing a tree', async () => {
        db.skillTree.findFirst.mockResolvedValue(null);

        const res = await run(asUser('dm', true), { type: 'reset' });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ unlocked: [] });
        expect(tableWrite()).toMatchObject({ characterId: 'ch', progress: {} });
        expect(db.character.update).not.toHaveBeenCalled();
    });

    it('a concurrent level change answers 409 and writes nothing', async () => {
        db.character.updateMany.mockResolvedValue({ count: 0 });

        const res = await run(asUser('owner'), {
            type: 'learn',
            nodeId: 'attack_basic_level',
        });

        expect(res.status).toBe(409);
        expect(await res.json()).toMatchObject({
            error: API_ERRORS.CHARACTER_PROGRESS_CHANGED,
        });
    });

    it('a progress version conflict answers 409 and writes no column', async () => {
        db.skillTreeProgress.findUnique.mockResolvedValue({
            progress: {},
            version: 3,
        });
        db.skillTreeProgress.updateMany.mockResolvedValue({ count: 0 });

        const res = await run(asUser('owner'), {
            type: 'learn',
            nodeId: 'attack_basic_level',
        });

        expect(res.status).toBe(409);
        expect(db.skillTreeProgress.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { characterId: 'ch', version: 3 },
            })
        );
        expect(db.character.update).not.toHaveBeenCalled();
    });
});
