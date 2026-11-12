import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { CHARACTER_OPERATIONS } from '@/lib/server/characters/operations/registry';
import { createBattleParticipantFromCharacter } from '@/lib/utils/battle/participant/from-character';
import { buildCharacterSheet } from '@/lib/utils/characters/sheet';
import { parseRules } from '@/lib/utils/rules/schema';
import { resolveClassEntries } from '@/lib/utils/spells/class-slots';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import type { GameClassData } from '@/types/classes';

const h = vi.hoisted(() => ({
    character: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    $queryRaw: vi.fn(),
    characterInventory: { create: vi.fn() },
    race: { findFirst: vi.fn() },
    notify: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: { ...h, $transaction: (fn: (db: typeof h) => unknown) => fn(h) },
}));
vi.mock('@/lib/server/notifications/notify', () => ({
    notifyCharacterOwners: h.notify,
}));

const NOW = 1793016000000;

const cls = (over: Partial<GameClassData> & { id: string }): GameClassData => ({
    name: over.id,
    icon: null,
    color: null,
    hitDie: 10,
    savingThrows: ['strength', 'constitution'],
    proficiencies: { armor: [], weapons: [], tools: [] },
    skillChoices: { count: 0, from: [] },
    caster: 'none',
    spellcastingAbility: null,
    features: [],
    subclassLevel: 3,
    subclasses: [],
    ...over,
});

const warlock = cls({
    id: 'warlock',
    name: 'Чорнокнижник',
    hitDie: 8,
    caster: 'pact',
    spellcastingAbility: 'charisma',
    savingThrows: ['wisdom', 'charisma'],
});

const classesById = { warlock };

const COMPOSITIONS = {
    dnd5e: parseRules({ system: { key: 'dnd5e' }, classes: { enabled: true } }),
    homm: parseRules({ system: { key: 'homm' } }),
    wfrp: parseRules({ system: { key: 'wfrp' } }),
    'dnd5e+morale': parseRules({
        system: { key: 'dnd5e', modules: ['morale'] },
        classes: { enabled: true },
    }),
};

type Name = keyof typeof COMPOSITIONS;

const NAMES = Object.keys(COMPOSITIONS) as Name[];

const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const snap = (slice: string, name: Name, value: unknown) =>
    expect(stable(value)).toMatchFileSnapshot(
        `./__snapshots__/d12/${slice}-${name}.json`
    );

const foreign = {
    strength: 14,
    dexterity: 12,
    constitution: 13,
    intelligence: 8,
    wisdom: 10,
    charisma: 16,
    armorClass: 15,
    initiative: 12,
    speed: 35,
    level: 4,
    class: 'Воїн',
    subclass: 'Чемпіон',
    archetype: 'ranger' as const,
};

const characteristics = (name: Name) =>
    name === 'wfrp' ? { characteristics: DEFAULT_CHARACTERISTICS } : {};

const access = (rules: unknown) => ({
    userId: 'dm',
    isDM: true,
    campaign: { id: 'camp', maxLevel: 20, allowPlayerEdit: true, rules },
});

const gate = (rules: unknown) => ({
    access: access(rules),
    campaignId: 'camp',
    characterId: 'hero',
});

type Operation = {
    schema: { parse(value: unknown): unknown };
    run(gate: unknown, input: unknown): Promise<unknown>;
};

const run = (name: 'create' | 'patch', g: unknown, input: unknown) => {
    const op = CHARACTER_OPERATIONS[name] as unknown as Operation;

    return op.run(g, op.schema.parse(input));
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    h.character.create.mockImplementation(
        async ({ data }: { data: object }) => ({ id: 'new', ...data })
    );
    h.character.update.mockImplementation(
        async ({ data }: { data: object }) => ({
            id: 'hero',
            level: 1,
            ...data,
        })
    );
    h.character.findUnique.mockResolvedValue({
        id: 'hero',
        classes: [],
        characteristics: null,
    });
    h.$queryRaw.mockResolvedValue([]);
    h.characterInventory.create.mockResolvedValue({});
    h.race.findFirst.mockResolvedValue(null);
});

describe('D12 create', () => {
    it.each(NAMES)('%s', async (name) => {
        await run('create', gate(COMPOSITIONS[name]), {
            name: 'Hero',
            type: 'npc_hero',
            controlledBy: 'dm',
            race: 'Людина',
            ...foreign,
            ...characteristics(name),
        });

        await snap('create', name, h.character.create.mock.calls[0][0]);
    });

    it.each(['dnd5e', 'dnd5e+morale'] as const)(
        '%s without a class is rejected',
        async (name) => {
            const { class: _c, subclass: _s, ...rest } = foreign;

            const error = await run('create', gate(COMPOSITIONS[name]), {
                name: 'Hero',
                type: 'npc_hero',
                controlledBy: 'dm',
                race: 'Людина',
                ...rest,
            }).catch((e: unknown) => e);

            expect(error).toMatchObject({
                message: 'errors.heroClassRequired',
                status: 400,
            });
            expect(h.character.create).not.toHaveBeenCalled();
        }
    );
});

describe('D12 patch', () => {
    it.each(NAMES)('%s', async (name) => {
        const character = {
            ...foreign,
            id: 'hero',
            campaignId: 'camp',
            level: 1,
            race: 'Людина',
            classes: [],
            spellcastingAbility: null,
            immunities: [],
            controlledBy: 'dm',
            type: 'npc_hero',
            avatar: null,
            seenLevel: null,
            knownSpells: [],
            spellSlots: {},
        };

        await run(
            'patch',
            { access: access(COMPOSITIONS[name]), character },
            { name: 'Renamed', ...foreign, ...characteristics(name) }
        );

        await snap('patch', name, h.character.update.mock.calls[0][0]);
    });
});

const base = {
    id: 'ch1',
    campaignId: 'c1',
    name: 'Герой',
    race: 'Людина',
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
    initiative: 0,
    morale: 1,
    controlledBy: 'u1',
    immunities: [],
    knownSpells: [],
    equipment: {},
    skillTreeProgress: {},
    personalSkillId: null,
    archetype: null,
    classes: [],
    raceChoices: {},
    feats: [],
    skills: {},
    savingThrows: {},
};

const characterFor = (name: Name) => {
    if (name === 'wfrp') return { ...base, ...characteristics(name) };

    if (name === 'homm') return { ...base, archetype: 'ranger' };

    return {
        ...base,
        class: 'Чорнокнижник',
        classes: [{ classId: 'warlock', level: 3 }],
        spellcastingAbility: 'charisma',
    };
};

const participantFor = (name: Name) => {
    const rules = COMPOSITIONS[name];

    const context = {
        skillTreeByRace: {},
        mainSkills: [],
        spells: [],
        allSkills: [],
        racesByName: { Людина: null },
        campaign: { maxLevel: 20 },
        skillsById: {},
        artifactsById: {},
        artifactSetsById: {},
        artifactSetMemberIds: {},
        rules,
        classesById,
        featsById: {},
    } as never;

    return createBattleParticipantFromCharacter(
        characterFor(name) as never,
        'b1',
        ParticipantSide.ALLY,
        undefined,
        context
    );
};

const withStableId = <T extends { basicInfo: { id: string } }>(p: T) => ({
    ...p,
    basicInfo: { ...p.basicInfo, id: 'participant' },
});

describe('D12 participant', () => {
    it.each(NAMES)('%s', async (name) => {
        await snap(
            'participant',
            name,
            withStableId(await participantFor(name))
        );
    });
});

describe('D12 sheet', () => {
    it.each(NAMES)('%s', async (name) => {
        const participant = await participantFor(name);

        const character = characterFor(name);

        const sheet = buildCharacterSheet({
            participant,
            viewer: { isDM: true, isOwner: false },
            maxLevel: 20,
            rules: COMPOSITIONS[name],
            classes: resolveClassEntries(
                character.classes as never,
                classesById
            ),
            character: {
                ...character,
                avatar: null,
                subclass: null,
                alignment: null,
                languages: [],
                proficiencies: {},
                spellcastingAbility:
                    (character as { spellcastingAbility?: string })
                        .spellcastingAbility ?? null,
                primaryAbility: null,
                background: null,
                goals: [],
            } as never,
            raceIcon: null,
            immunities: [],
            artifacts: [],
            spells: [],
            personalSkill: null,
            progression: { freePoints: 0, level: 3, seenLevel: null },
        });

        await snap('sheet', name, sheet);
    });
});
