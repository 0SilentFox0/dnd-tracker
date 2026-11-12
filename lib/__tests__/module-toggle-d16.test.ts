import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    character: { delete: vi.fn(), deleteMany: vi.fn() },
    characterInventory: { delete: vi.fn(), deleteMany: vi.fn() },
    campaign: { delete: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: h }));

import { ParticipantSide } from '@/lib/constants/battle';
import { buildCharacterUpdateData } from '@/lib/server/characters/core/build-character-update-data';
import { normalizeCharacterInput } from '@/lib/server/characters/core/system-fields';
import { createBattleParticipantFromCharacter } from '@/lib/utils/battle/participant/from-character';
import { buildCharacterSheet } from '@/lib/utils/characters/sheet';
import { mergeRules, parseRules, type Ruleset } from '@/lib/utils/rules/schema';
import { PRESETS } from '@/lib/utils/rules/systems/catalog';
import { ruleSystemOf } from '@/lib/utils/rules/systems/registry';
import { buildTreeJson } from '@/lib/utils/skills/progression';

const FULL = PRESETS.homm.modules;

const without = (id: string) => FULL.filter((m) => m !== id);

const RAW = {
    system: { key: 'homm' },
    heroScaling: {
        hpBaseLevels: 5,
        hpConCoefficient: 2,
        meleeDiceByLevel: null,
        rangedDiceByLevel: null,
    },
};

const MODULES = [
    { id: 'heroscaling', column: 'archetype' },
    { id: 'skilltrees', column: 'personalSkillId' },
    { id: 'artifactsets' },
] as const;

const rulesWith = (modules: readonly string[]): Ruleset =>
    parseRules({ system: { key: 'homm', modules } });

const mustMerge = (
    current: Ruleset,
    modules: readonly string[],
    raw: unknown
) => {
    const result = mergeRules(
        current,
        { system: { key: 'homm', modules: [...modules] } },
        raw
    );

    if (!result.ok || !result.stored)
        throw new Error(JSON.stringify(!result.ok && result.issues));

    return result.stored;
};

const tree = {
    id: 'row-tree',
    race: 'Ельф',
    skills: buildTreeJson({
        race: 'Ельф',
        branches: [{ id: 'light', name: 'Світло', color: 'y' }],
    }),
};

const art = (id: string, slot: string) => ({
    id,
    campaignId: 'c1',
    name: id,
    slot,
    setId: 'set1',
    icon: null,
    rarity: 'rare',
    description: null,
    bonuses: {},
    modifiers: [],
    abilities: [],
});

const hero = {
    id: 'ch1',
    campaignId: 'c1',
    name: 'Герой',
    race: 'Ельф',
    class: '',
    level: 3,
    strength: 10,
    dexterity: 12,
    constitution: 14,
    intelligence: 10,
    wisdom: 10,
    charisma: 16,
    armorClass: 12,
    speed: 30,
    initiative: 10,
    morale: 1,
    controlledBy: 'u1',
    immunities: [],
    knownSpells: [],
    equipment: {},
    skillTreeProgress: {
        'row-tree': { unlockedSkills: ['light_basic_level'] },
    },
    personalSkillId: 'ps',
    archetype: 'ranger',
    classes: [],
    raceChoices: {},
    feats: [],
    skills: {},
    savingThrows: {},
    inventory: { equipped: { helmet: 'a1', ring: 'a2' } },
};

const context = (rules: Ruleset) =>
    ({
        skillTreeByRace: { Ельф: tree },
        mainSkills: [{ id: 'light', spellGroupId: 'sg', name: 'Світло' }],
        spells: [{ id: 's1', level: 1, spellGroup: { id: 'sg' } }],
        allSkills: [{ id: 'ps', grantedSpellId: 'avatar' }],
        racesByName: { Ельф: null },
        campaign: { maxLevel: 20 },
        skillsById: {},
        artifactsById: { a1: art('a1', 'helmet'), a2: art('a2', 'ring') },
        artifactSetsById: {
            set1: {
                id: 'set1',
                name: 'Сет',
                icon: null,
                setBonus: { x: 1 },
                abilities: [],
            },
        },
        artifactSetMemberIds: { set1: ['a1', 'a2'] },
        rules,
        classesById: {},
        featsById: {},
    }) as never;

const sheetFor = async (rules: Ruleset, stored: typeof hero = hero) => {
    const participant = await createBattleParticipantFromCharacter(
        stored as never,
        'b1',
        ParticipantSide.ALLY,
        undefined,
        context(rules)
    );

    const sheet = buildCharacterSheet({
        participant,
        viewer: { isDM: true, isOwner: false },
        maxLevel: 20,
        rules,
        classes: undefined,
        character: {
            ...stored,
            avatar: null,
            subclass: null,
            alignment: null,
            languages: [],
            proficiencies: {},
            spellcastingAbility: null,
            primaryAbility: null,
            background: null,
            goals: [],
        } as never,
        raceIcon: null,
        immunities: [],
        artifacts: [],
        spells: participant.spellcasting.knownSpells.map((id) => ({
            id,
        })) as never,
        personalSkill: null,
        progression: { freePoints: 0, level: 3, seenLevel: null },
    });

    return { sheet, known: participant.spellcasting.knownSpells };
};

beforeEach(() => vi.clearAllMocks());

describe.each(MODULES)('D16 module toggle: $id', (mod) => {
    const rulesOn = rulesWith(FULL);

    const rulesOff = rulesWith(without(mod.id));

    if (mod.id === 'heroscaling')
        it('rules: sections survive switching the module off and on', () => {
            const off = mustMerge(parseRules(RAW), without(mod.id), RAW);

            expect(off.heroScaling).toEqual(RAW.heroScaling);

            const on = mustMerge(parseRules(off), FULL, off);

            expect(parseRules(on).heroScaling).toEqual(
                parseRules(RAW).heroScaling
            );
            expect(on.heroScaling).toEqual(RAW.heroScaling);
            expect(parseRules(on).system.modules).toEqual([...FULL].sort());
        });

    it('rules: the module is really absent after switching off', () => {
        expect(rulesOff.system.modules).not.toContain(mod.id);
        expect(rulesOn.system.modules ?? FULL).toContain(mod.id);
    });

    if ('column' in mod)
        it(`column ${mod.column} is dropped without the module`, () => {
            const input = { name: 'n', [mod.column]: 'x' } as never;

            const off = normalizeCharacterInput(
                ruleSystemOf(rulesOff),
                input,
                rulesOff,
                'update'
            );

            const on = normalizeCharacterInput(
                ruleSystemOf(rulesOn),
                input,
                rulesOn,
                'update'
            );

            expect(off).not.toHaveProperty(mod.column);
            expect(on).toHaveProperty(mod.column, 'x');
        });

    if (mod.id === 'skilltrees')
        it('level-down resets the tree only with the module', () => {
            const lower = (rules: Ruleset) =>
                buildCharacterUpdateData({
                    character: {
                        ...hero,
                        spellSlots: {},
                        seenLevel: null,
                    } as never,
                    data: { level: 2 },
                    campaign: { maxLevel: 20 },
                    race: null,
                    resets: ruleSystemOf(rules).progression.levelResets,
                }).columnResets;

            expect(lower(rulesOff)).not.toHaveProperty('skillTreeProgress');
            expect(lower(rulesOn)).toEqual({ skillTreeProgress: {} });
        });

    it('sheet: module data disappears and comes back identical', async () => {
        const { sheet: sheetOn, known: knownOn } = await sheetFor(rulesOn);

        const { sheet: sheetOff, known: knownOff } = await sheetFor(rulesOff);

        if (mod.id === 'heroscaling') {
            expect(sheetOn.identity.archetype).toBe('ranger');
            expect(sheetOff.identity.archetype).toBe('universal');
            expect(sheetOff.hp.total).toBe(1);
        }

        if (mod.id === 'skilltrees') {
            expect(knownOn).toEqual(expect.arrayContaining(['s1', 'avatar']));
            expect(knownOff).not.toContain('s1');
            expect(knownOff).not.toContain('avatar');
        }

        if (mod.id === 'artifactsets') {
            expect(sheetOn.items.sets).toHaveLength(1);
            expect(sheetOff.items.sets).toEqual([]);
        }
    });

    it('a whole-form PATCH while the module is off keeps its data: the sheet is unchanged after switching on', async () => {
        const { sheet: sheetOn } = await sheetFor(rulesOn);

        const form = {
            name: 'Герой',
            level: 3,
            ...('column' in mod ? { [mod.column]: 'other' } : {}),
        } as never;

        const written = normalizeCharacterInput(
            ruleSystemOf(rulesOff),
            form,
            rulesOff,
            'update'
        );

        const { columnResets } = buildCharacterUpdateData({
            character: { ...hero, spellSlots: {}, seenLevel: null } as never,
            data: form,
            campaign: { maxLevel: 20 },
            race: null,
            resets: ruleSystemOf(rulesOff).progression.levelResets,
        });

        if ('column' in mod) expect(written).not.toHaveProperty(mod.column);

        expect(columnResets).toEqual({});

        const stored = { ...hero, ...written, ...columnResets };

        expect(stored).toEqual(expect.objectContaining(hero));

        const { sheet: sheetBack } = await sheetFor(rulesOn, stored);

        expect(sheetBack).toEqual(sheetOn);

        for (const model of Object.values(h)) {
            expect(model.delete).not.toHaveBeenCalled();
            expect(model.deleteMany).not.toHaveBeenCalled();
        }
    });
});
