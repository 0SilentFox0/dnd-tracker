import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {} }));

import { ParticipantSide } from '@/lib/constants/battle';
import { createBattleParticipantFromCharacter } from '@/lib/utils/battle/participant/from-character';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import { parseRules } from '@/lib/utils/rules/schema';
import { buildTreeJson } from '@/lib/utils/skills/progression';
import { resolveLearnedSpellsAndMastery } from '@/systems/skilltrees/server/participant/learned-spells';

const tree = {
    id: 'row-tree',
    race: 'Ельф',
    skills: buildTreeJson({
        race: 'Ельф',
        branches: [{ id: 'light', name: 'Світло', color: 'y' }],
    }),
};

const context = {
    skillTreeByRace: { Ельф: tree },
    mainSkills: [{ id: 'light', spellGroupId: 'sg', name: 'Світло' }],
    spells: [{ id: 's1', level: 1, spellGroup: { id: 'sg' } }],
    allSkills: [],
} as never;

const resolve = (
    character: never,
    knownSpells: string[],
    ctx: never = context
) => resolveLearnedSpellsAndMastery({ character, knownSpells, context: ctx });

describe('resolveLearnedSpellsAndMastery', () => {
    it('рівень гілки зі школою магії додає заклинання до knownSpells', async () => {
        const character = {
            id: 'c',
            race: 'Ельф',
            campaignId: 'camp',
            skillTreeProgress: {
                'row-tree': { unlockedSkills: ['light_basic_level'] },
            },
        } as never;

        expect((await resolve(character, ['k'])).knownSpells).toEqual([
            'k',
            's1',
        ]);
    });

    it('без дерева — лише knownSpells', async () => {
        const character = {
            id: 'c',
            race: 'Гном',
            campaignId: 'camp',
            skillTreeProgress: {},
        } as never;

        expect(
            (
                await resolve(character, ['k'], {
                    ...(context as object),
                    skillTreeByRace: {},
                } as never)
            ).knownSpells
        ).toEqual(['k']);
    });

    it('персональне вміння додає своє закляття навіть без дерева', async () => {
        const character = {
            id: 'c',
            race: 'Гном',
            campaignId: 'camp',
            skillTreeProgress: {},
            personalSkillId: 'ps',
        } as never;

        const ctx = {
            ...(context as object),
            skillTreeByRace: {},
            allSkills: [{ id: 'ps', grantedSpellId: 'avatar' }],
        } as never;

        expect((await resolve(character, ['k'], ctx)).knownSpells).toEqual([
            'k',
            'avatar',
        ]);
    });
});

describe('закляття персонального вміння в учаснику залежать від складу', () => {
    const hero = {
        id: 'ch1',
        campaignId: 'c1',
        name: 'Герой',
        race: 'Людина',
        class: '',
        level: 3,
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        armorClass: 10,
        speed: 30,
        initiative: 10,
        morale: 0,
        controlledBy: 'u1',
        immunities: [],
        knownSpells: [],
        equipment: {},
        skillTreeProgress: {},
        personalSkillId: 'ps',
        archetype: null,
        classes: [],
    };

    const build = (rules: typeof DEFAULT_RULES) =>
        createBattleParticipantFromCharacter(
            hero as never,
            'b1',
            ParticipantSide.ALLY,
            undefined,
            {
                skillTreeByRace: {},
                mainSkills: [],
                spells: [],
                allSkills: [{ id: 'ps', grantedSpellId: 'avatar' }],
                racesByName: { Людина: null },
                campaign: { maxLevel: 20 },
                skillsById: {},
                artifactsById: {},
                artifactSetsById: {},
                artifactSetMemberIds: {},
                rules,
                classesById: {},
                featsById: {},
            } as never
        );

    it('homm: закляття додається', async () => {
        const p = await build(DEFAULT_RULES);

        expect(p.spellcasting.knownSpells).toContain('avatar');
    });

    it('голий dnd5e без skilltrees: закляття не додається', async () => {
        const p = await build(parseRules({ system: { key: 'dnd5e' } }));

        expect(p.spellcasting.knownSpells).not.toContain('avatar');
    });
});
