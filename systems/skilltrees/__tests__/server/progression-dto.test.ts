import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    race: { findFirst: vi.fn() },
    skill: { findMany: vi.fn() },
    mainSkill: { findMany: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: db }));

import { buildTreeJson } from '@/lib/utils/skills/progression';
import {
    buildProgressionDto,
    PROGRESSION_SKILL_SELECT,
} from '@/systems/skilltrees/server/progression/dto';
import type { ProgressionContext } from '@/systems/skilltrees/server/progression/context';

const treeRow = {
    id: 'row',
    campaignId: 'camp',
    race: 'Elf',
    skills: buildTreeJson({
        id: 'json',
        race: 'Elf',
        branches: [
            { id: 'attack', name: 'Json name', color: 'red', outer: ['o1'] },
        ],
    }),
};

const ctx = (over: Partial<ProgressionContext> = {}): ProgressionContext => ({
    character: {
        id: 'ch',
        level: 4,
        race: 'Elf',
        skillTreeProgress: { row: { unlockedSkills: ['attack_basic_level'] } },
        seenLevel: 3,
        controlledBy: 'owner',
    },
    progressRead: {},
    treeRow: treeRow as ProgressionContext['treeRow'],
    isDM: false,
    isOwner: true,
    ...over,
});

describe('buildProgressionDto', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        db.race.findFirst.mockResolvedValue({ icon: 'elf.png' });
        db.skill.findMany.mockResolvedValue([]);
        db.mainSkill.findMany.mockResolvedValue([]);
    });

    it('without a tree returns an empty progression with the character header', async () => {
        const dto = await buildProgressionDto('camp', ctx({ treeRow: null }));

        expect(dto).toEqual({
            race: 'Elf',
            raceIcon: 'elf.png',
            level: 4,
            seenLevel: 3,
            isOwner: true,
            isDM: false,
            treeId: null,
            tree: null,
            unlocked: [],
            skills: {},
            branches: {},
        });
        expect(db.skill.findMany).not.toHaveBeenCalled();
    });

    it('race icon is null when the race row is gone', async () => {
        db.race.findFirst.mockResolvedValue(null);

        expect((await buildProgressionDto('camp', ctx())).raceIcon).toBeNull();
    });

    it('lists the unlocked nodes of the tree', async () => {
        const dto = await buildProgressionDto('camp', ctx());

        expect(dto.treeId).toBe('row');
        expect(dto.unlocked).toEqual(['attack_basic_level']);
    });

    it('branch display data prefers the live main skill over the tree copy', async () => {
        db.mainSkill.findMany.mockResolvedValue([
            {
                id: 'attack',
                name: 'Live name',
                color: 'blue',
                icon: 'a.png',
                spellGroupId: 'fire',
            },
        ]);

        const dto = await buildProgressionDto('camp', ctx());

        expect(dto.branches.attack).toEqual({
            name: 'Live name',
            color: 'blue',
            icon: 'a.png',
            spellGroupId: 'fire',
        });
    });

    it('falls back to the tree copy when the main skill is missing', async () => {
        const dto = await buildProgressionDto('camp', ctx());

        expect(dto.branches.attack).toMatchObject({
            name: 'Json name',
            color: 'red',
        });
    });

    it('skills are fetched by tree skill id and mapped to client info', async () => {
        db.skill.findMany.mockResolvedValue([
            {
                id: 'o1',
                name: 'Bash',
                icon: null,
                description: null,
                abilities: [],
                spellGroupId: null,
                grantedSpellId: null,
            },
        ]);

        const dto = await buildProgressionDto('camp', ctx());

        expect(db.skill.findMany).toHaveBeenCalledWith({
            where: { campaignId: 'camp', id: { in: ['o1'] } },
            select: PROGRESSION_SKILL_SELECT,
        });
        expect(dto.skills.o1).toMatchObject({
            name: 'Bash',
            icon: null,
            description: '',
        });
    });
});
