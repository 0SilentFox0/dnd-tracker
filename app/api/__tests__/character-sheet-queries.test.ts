import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { buildTreeJson } from '@/lib/utils/skills/progression';

const db = vi.hoisted(() => ({
    calls: {} as Record<string, number>,
    args: {} as Record<string, unknown[]>,
    results: {} as Record<string, unknown>,
}));

vi.mock('@/lib/server/scenario/player-story', () => ({
    loadStoryChapters: vi.fn(async () => []),
}));
vi.mock('@/lib/db', () => {
    const model = (name: string) =>
        new Proxy(
            {},
            {
                get: (_t, method: string) => async (arg: unknown) => {
                    const key = `${name}.${method}`;

                    db.calls[key] = (db.calls[key] ?? 0) + 1;
                    (db.args[key] ??= []).push(arg);

                    const result = db.results[key];

                    if (typeof result === 'function')
                        return (result as (a: unknown) => unknown)(arg);

                    return key in db.results
                        ? result
                        : method === 'findMany'
                          ? []
                          : null;
                },
            }
        );

    return {
        prisma: new Proxy({}, { get: (_t, name: string) => model(name) }),
    };
});

import '@/lib/server/systems/registry';
import {
    buildSheetFor,
    loadSheetCharacter,
} from '@/lib/server/characters/core/sheet-handler';

const rage = {
    id: 'r',
    name: 'Лють',
    trigger: { event: 'passive' },
    effects: [{ kind: 'damageBonus', filter: { kind: 'melee' }, percent: 10 }],
};

const armor = {
    id: 'a1',
    campaignId: 'c',
    name: 'Кольчуга',
    slot: 'armor',
    icon: null,
    rarity: 'rare',
    description: null,
    bonuses: {},
    modifiers: [],
    abilities: [],
    setId: null,
    artifactSet: null,
};

const huntSet = {
    id: 's1',
    campaignId: 'c',
    name: 'Мисливець',
    setBonus: null,
    icon: null,
    abilities: [rage],
    artifacts: [{ id: 'a1' }],
};

const tree = {
    id: 'row-tree',
    campaignId: 'c',
    race: 'Ельф',
    skills: buildTreeJson({
        id: 'json-tree',
        race: 'Ельф',
        branches: [
            {
                id: 'attack',
                name: 'Напад',
                color: 'red',
                levels: { basic: 'atk-b' },
                outer: ['o1'],
                middle: [],
                inner: [],
            },
        ],
    }),
};

const skill = (id: string) => ({
    id,
    campaignId: 'c',
    name: id,
    icon: null,
    description: `опис ${id}`,
    abilities: [],
    spellGroupId: null,
    spellNewSpellId: null,
    mainSkillId: null,
});

const character = {
    id: 'ch',
    campaignId: 'c',
    type: 'player',
    controlledBy: 'u',
    name: 'Ліра',
    level: 5,
    class: 'Ranger',
    subclass: null,
    race: 'Ельф',
    subrace: null,
    alignment: null,
    background: null,
    avatar: null,
    strength: 10,
    dexterity: 16,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    armorClass: 14,
    initiative: 2,
    speed: 30,
    savingThrows: {},
    skills: {},
    spellcastingAbility: 'wisdom',
    spellSlots: {},
    knownSpells: ['sp1'],
    languages: [],
    proficiencies: {},
    skillTreeProgress: {
        'row-tree': { unlockedSkills: ['attack_basic_level', 'o1'] },
    },
    seenLevel: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    immunities: [],
    morale: 0,
    maxTargets: 1,
    minTargets: 1,
    personalSkillId: 'p1',
    hpMultiplier: null,
    meleeMultiplier: null,
    rangedMultiplier: null,
    primaryAbility: null,
    goals: [],
    inventory: {
        id: 'inv',
        characterId: 'ch',
        equipped: { armor: 'a1' },
        backpack: [],
        gold: 0,
        silver: 0,
        copper: 0,
        items: [],
    },
};

const bookSpell = {
    id: 'sp1',
    name: 'Іскра',
    level: 1,
    description: '',
    icon: null,
    dice: 1,
    cost: 'action',
    targeting: { kind: 'enemy' },
    resolution: { kind: 'auto' },
    spellGroup: null,
};

const total = () => Object.values(db.calls).reduce((a, b) => a + b, 0);

describe('лист персонажа: запити до БД', () => {
    beforeEach(() => {
        db.calls = {};
        db.args = {};
        db.results = {
            'character.findUnique': character,
            'skillTreeProgress.findUnique': {
                progress: character.skillTreeProgress,
            },
            'campaign.findUnique': (arg: {
                select: Record<string, unknown>;
            }) =>
                'races' in arg.select
                    ? {
                          races: [
                              {
                                  id: 'race',
                                  name: 'Ельф',
                                  icon: 'elf.png',
                                  passiveAbility: null,
                                  spellSlotProgression: [],
                                  abilities: [],
                              },
                          ],
                      }
                    : {
                          skills: [skill('atk-b'), skill('o1'), skill('p1')],
                          mainSkills: [],
                          spells: [{ id: 'sp1', level: 1, groupId: null }],
                      },
            'skillTree.findFirst': tree,
            'artifact.findMany': [armor],
            'spell.findMany': [bookSpell],
        };
    });

    it('персонаж із деревом, артефактами, особистим скілом і заклинаннями — не більше 7 викликів Prisma', async () => {
        const loaded = await loadSheetCharacter('ch');

        const sheet = await buildSheetFor(
            loaded as never,
            { isDM: false, isOwner: true },
            { maxLevel: 20, rules: DEFAULT_RULES }
        );

        expect(total()).toBeLessThanOrEqual(7);
        expect(db.calls['race.findFirst']).toBeUndefined();
        expect(db.calls['skillTree.findFirst']).toBe(1);
        expect(db.calls['campaign.findUnique']).toBe(2);
        expect(sheet.identity.raceIcon).toBe('elf.png');
        expect(sheet.personalSkill).toEqual({
            id: 'p1',
            name: 'p1',
            icon: null,
            description: 'опис p1',
        });
        expect(sheet.spells.map((s) => s.id)).toEqual(['sp1']);
        expect(sheet.items.artifacts.map((a) => a.name)).toEqual(['Кольчуга']);
    });

    it('сети й їх члени читаються двома окремими запитами за setId', async () => {
        db.results['artifact.findMany'] = [{ ...armor, setId: 's1' }];
        db.results['artifactSet.findMany'] = [huntSet];

        const sheet = await buildSheetFor(
            character as never,
            { isDM: false, isOwner: true },
            { maxLevel: 20, rules: DEFAULT_RULES }
        );

        expect(sheet.items.sets).toEqual([
            {
                setId: 's1',
                name: 'Мисливець',
                have: 1,
                total: 1,
                complete: true,
                effects: [
                    expect.objectContaining({
                        then: [
                            [
                                expect.objectContaining({
                                    key: 'summary.effects.damageBonus',
                                }),
                            ],
                        ],
                    }),
                ],
            },
        ]);
        expect(db.calls['artifactSet.findMany']).toBe(1);
        expect(db.calls['artifact.findMany']).toBe(2);
    });

    it('HP листа читає статблок з characteristics, а не застарілу колонку', async () => {
        const sheetOf = async (row: object) => {
            db.results['character.findUnique'] = row;

            return buildSheetFor(
                (await loadSheetCharacter('ch')) as never,
                { isDM: false, isOwner: true },
                { maxLevel: 20, rules: DEFAULT_RULES }
            );
        };

        const legacy = await sheetOf({ ...character, constitution: 20 });

        const migrated = await sheetOf({
            ...character,
            constitution: 10,
            characteristics: { constitution: 20 },
        });

        expect(migrated.hp).toEqual(legacy.hp);
        expect(migrated.hp.lines.map((l) => l.label)).not.toContain(
            'sheet.line.bonuses'
        );
    });

    it('прогресія в листі: вільні очки = рівень − вивчені вузли дерева', async () => {
        const sheet = await buildSheetFor(
            character as never,
            { isDM: false, isOwner: true },
            { maxLevel: 20, rules: DEFAULT_RULES }
        );

        expect(sheet.progression).toEqual({
            freePoints: 3,
            level: 5,
            seenLevel: 3,
        });
    });

    it('без дерева раси — 0 вільних очок', async () => {
        db.results['skillTree.findFirst'] = null;
        db.results['campaign.findUnique'] = {
            races: [],
            skills: [],
            mainSkills: [],
            spells: [],
        };

        const sheet = await buildSheetFor(
            character as never,
            { isDM: false, isOwner: true },
            { maxLevel: 20, rules: DEFAULT_RULES }
        );

        expect(sheet.progression.freePoints).toBe(0);
    });

    it('без вивчених вузлів і особистого скіла — без скілів, шкіл і заклинань кампанії', async () => {
        const fresh = { ...character, personalSkillId: null };

        db.results['skillTreeProgress.findUnique'] = { progress: {} };

        await buildSheetFor(
            fresh as never,
            { isDM: false, isOwner: true },
            { maxLevel: 20, rules: DEFAULT_RULES }
        );

        expect(db.calls['campaign.findUnique']).toBe(1);
        expect(db.args['campaign.findUnique'][0]).not.toHaveProperty(
            'select.spells'
        );
        expect(db.args['campaign.findUnique'][0]).not.toHaveProperty(
            'select.mainSkills'
        );
    });

    it('лише особистий скіл — скіл за id, без шкіл і заклинань', async () => {
        const personalOnly = { ...character };

        db.results['skillTreeProgress.findUnique'] = { progress: {} };

        await buildSheetFor(
            personalOnly as never,
            { isDM: false, isOwner: true },
            { maxLevel: 20, rules: DEFAULT_RULES }
        );

        const [, second] = db.args['campaign.findUnique'] as Array<{
            select: Record<string, unknown>;
        }>;

        expect(second.select.skills).toEqual({ where: { id: { in: ['p1'] } } });
        expect(second.select).not.toHaveProperty('spells');
        expect(second.select).not.toHaveProperty('mainSkills');
    });

    it('вивчені вузли — школи й заклинання лише для гілок дерева і вивчених скілів', async () => {
        await buildSheetFor(
            character as never,
            { isDM: false, isOwner: true },
            { maxLevel: 20, rules: DEFAULT_RULES }
        );

        const [, second] = db.args['campaign.findUnique'] as Array<{
            select: Record<string, { where?: unknown }>;
        }>;

        expect(second.select.mainSkills.where).toEqual({
            id: { in: ['attack'] },
        });
        expect(second.select.spells.where).toBeDefined();
    });
});
