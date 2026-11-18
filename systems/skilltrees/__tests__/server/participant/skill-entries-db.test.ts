import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTreeJson } from '@/lib/utils/skills/progression';
import { resolveCharacterSkillEntries } from '@/systems/skilltrees/server/participant/skill-entries';

const db = vi.hoisted(() => ({
    skillTree: { findFirst: vi.fn() },
    skill: { findMany: vi.fn() },
    mainSkill: { findMany: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ prisma: db }));

const TREE = {
    id: 'row-tree',
    race: 'Elf',
    skills: buildTreeJson({
        race: 'Elf',
        branches: [
            {
                id: 'attack',
                name: 'Attack',
                color: 'red',
                levels: { basic: 'lvl-b' },
                outer: [],
            },
        ],
        racial: {},
    }),
};

const character = (extra: Record<string, unknown> = {}) =>
    ({
        id: 'c',
        race: 'Elf',
        campaignId: 'camp',
        skillTreeProgress: {
            'row-tree': { unlockedSkills: ['attack_basic_level'] },
        },
        ...extra,
    }) as never;

describe('resolveCharacterSkillEntries without preloaded data', () => {
    beforeEach(() => vi.resetAllMocks());

    it('loads tree, skills and main skill spell groups from the database', async () => {
        db.skillTree.findFirst.mockResolvedValue(TREE);
        db.skill.findMany.mockResolvedValue([
            { id: 'lvl-b', name: 'Strike', mainSkillId: 'attack' },
        ]);
        db.mainSkill.findMany.mockResolvedValue([
            { id: 'attack', spellGroupId: 'fire' },
        ]);

        const entries = await resolveCharacterSkillEntries(character(), 'camp');

        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
            mainSkillId: 'attack',
            mainSkillSpellGroupId: 'fire',
        });
        expect(entries[0].row.id).toBe('lvl-b');
    });

    it('leaves the spell group empty when the main skill has none', async () => {
        db.skillTree.findFirst.mockResolvedValue(TREE);
        db.skill.findMany.mockResolvedValue([
            { id: 'lvl-b', name: 'Strike', mainSkillId: 'attack' },
        ]);
        db.mainSkill.findMany.mockResolvedValue([
            { id: 'attack', spellGroupId: null },
        ]);

        const [entry] = await resolveCharacterSkillEntries(character(), 'camp');

        expect(entry.mainSkillSpellGroupId).toBeNull();
    });

    it('returns only the personal skill when the race has no tree', async () => {
        db.skillTree.findFirst.mockResolvedValue(null);
        db.skill.findMany.mockResolvedValue([
            { id: 'pers', name: 'Personal', mainSkillId: null },
        ]);
        db.mainSkill.findMany.mockResolvedValue([]);

        const entries = await resolveCharacterSkillEntries(
            character({ personalSkillId: ' pers ' }),
            'camp'
        );

        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({ personal: true, level: 'basic' });
        expect(db.mainSkill.findMany).not.toHaveBeenCalled();
    });

    it('skips rows that no longer exist', async () => {
        db.skillTree.findFirst.mockResolvedValue(TREE);
        db.skill.findMany.mockResolvedValue([]);

        expect(await resolveCharacterSkillEntries(character(), 'camp')).toEqual(
            []
        );
    });
});
