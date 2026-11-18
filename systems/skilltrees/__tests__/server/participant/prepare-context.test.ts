import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    skillTree: { findMany: vi.fn() },
    skill: { findMany: vi.fn() },
    mainSkill: { findMany: vi.fn() },
    skillTreeProgress: { findMany: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ prisma: db }));

import { buildTreeJson } from '@/lib/utils/skills/progression';
import { skillTreeContext } from '@/systems/skilltrees/server/participant/context';
import { prepareSkillTreeContext } from '@/systems/skilltrees/server/participant/prepare-context';

const tree = {
    id: 'row-tree',
    race: 'Ельф',
    skills: buildTreeJson({
        race: 'Ельф',
        branches: [{ id: 'light', name: 'Світло', color: 'y' }],
    }),
};

const context = () =>
    ({ ext: {}, allSkills: [], skillsById: {}, spells: [] }) as never;

const hero = (race: string, extra: object = {}) =>
    ({
        id: race,
        race,
        campaignId: 'c1',
        skillTreeProgress: {},
        ...extra,
    }) as never;

describe('prepareSkillTreeContext', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        db.skillTree.findMany.mockResolvedValue([tree]);
        db.skill.findMany.mockResolvedValue([]);
        db.mainSkill.findMany.mockResolvedValue([]);
        db.skillTreeProgress.findMany.mockResolvedValue([]);
    });

    it('reads only the trees of the party races and the branches of those trees', async () => {
        const ctx = context();

        await prepareSkillTreeContext('c1', ctx, {
            characters: [hero('Ельф'), hero('Гном')],
        });

        expect(db.skillTree.findMany).toHaveBeenCalledExactlyOnceWith({
            where: { campaignId: 'c1', race: { in: ['Ельф', 'Гном'] } },
        });
        expect(db.mainSkill.findMany).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({
                where: { campaignId: 'c1', id: { in: ['light'] } },
            })
        );
        expect(skillTreeContext.read(ctx as never)?.treeByRace).toEqual({
            Ельф: tree,
            Гном: null,
        });
    });

    it('loads referenced skills by id and merges them into the shared maps', async () => {
        db.skill.findMany.mockResolvedValue([{ id: 'ps' }]);
        db.skillTree.findMany.mockResolvedValue([]);

        const ctx = context();

        await prepareSkillTreeContext('c1', ctx, {
            characters: [hero('Гном', { personalSkillId: 'ps' })],
        });

        expect(db.skill.findMany).toHaveBeenCalledExactlyOnceWith({
            where: { campaignId: 'c1', id: { in: ['ps'] } },
        });
        expect(db.mainSkill.findMany).not.toHaveBeenCalled();
        expect((ctx as { skillsById: object }).skillsById).toEqual({
            ps: { id: 'ps' },
        });
    });

    it('does not query without characters', async () => {
        const ctx = context();

        await prepareSkillTreeContext('c1', ctx, { characters: [] });

        expect(db.skillTree.findMany).not.toHaveBeenCalled();
        expect(skillTreeContext.read(ctx as never)).toEqual({
            treeByRace: {},
            mainSkills: [],
            progress: {},
        });
    });

    it('puts the table progress into the ext slot, falling back to the column', async () => {
        db.skillTreeProgress.findMany.mockResolvedValue([
            { characterId: 'a', progress: { t: ['table'] } },
        ]);

        const ctx = context();

        await prepareSkillTreeContext('c1', ctx, {
            characters: [
                hero('Ельф', { id: 'a', skillTreeProgress: { t: ['column'] } }),
                hero('Ельф', {
                    id: 'b',
                    skillTreeProgress: { t: ['column-b'] },
                }),
            ],
        });

        expect(skillTreeContext.read(ctx as never)?.progress).toEqual({
            a: { t: ['table'] },
            b: { t: ['column-b'] },
        });
    });
});
