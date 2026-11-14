import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { createBattleParticipantFromCharacter } from '@/lib/server/battles/participant/from-character';
import { CHARACTER_OPERATIONS } from '@/lib/server/characters/operations/registry';
import { hashJson } from '@/lib/utils/battle/store/stable-json';
import { parseRules } from '@/lib/utils/rules/schema';

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

const rules = parseRules({ system: { key: 'dnd5e' } });

const STATS = {
    strength: 14,
    dexterity: 12,
    constitution: 13,
    intelligence: 8,
    wisdom: 10,
    charisma: 16,
    armorClass: 15,
    initiative: 12,
    speed: 35,
};

const row = (characteristics: object) => ({
    id: 'ch1',
    campaignId: 'c1',
    name: 'Hero',
    race: 'Людина',
    class: '',
    level: 3,
    ...STATS,
    morale: 0,
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
    characteristics,
});

const build = (character: object) =>
    createBattleParticipantFromCharacter(
        character as never,
        'b1',
        ParticipantSide.ALLY,
        undefined,
        {
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
            classesById: {},
            featsById: {},
        } as never
    );

const stable = <T extends { basicInfo: { id: string } }>(p: T) => ({
    ...p,
    basicInfo: { ...p.basicInfo, id: 'participant' },
});

describe('fromCharacter dual-read', () => {
    it('legacy and migrated rows give identical snapshot and hash', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(1);

        const legacy = stable(await build(row({})));

        const migrated = stable(
            await build({
                ...row({ ...STATS }),
                strength: 1,
                armorClass: 1,
                speed: 1,
            })
        );

        expect(migrated).toEqual(legacy);
        expect(hashJson(migrated)).toBe(hashJson(legacy));
    });
});

const gate = {
    access: {
        userId: 'dm',
        isDM: true,
        campaign: { id: 'camp', maxLevel: 20, allowPlayerEdit: true, rules },
    },
    campaignId: 'camp',
    characterId: 'hero',
};

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
    h.character.create.mockImplementation(
        async ({ data }: { data: object }) => ({ id: 'new', ...data })
    );
    h.character.update.mockImplementation(
        async ({ data }: { data: object }) => ({ id: 'hero', level: 1, ...data })
    );
    h.$queryRaw.mockResolvedValue([]);
    h.characterInventory.create.mockResolvedValue({});
    h.race.findFirst.mockResolvedValue(null);
});

describe('d20 dual-write', () => {
    it('create writes columns and characteristics', async () => {
        await run('create', gate, {
            name: 'Hero',
            type: 'npc_hero',
            controlledBy: 'dm',
            race: 'Людина',
            class: 'Воїн',
            ...STATS,
        });

        const { data } = h.character.create.mock.calls[0][0];

        expect(data).toMatchObject({ ...STATS, characteristics: STATS });
    });

    it('patch writes changed columns into previous characteristics', async () => {
        await run(
            'patch',
            {
                access: gate.access,
                character: {
                    ...row({ strength: 14, speed: 30 }),
                    campaignId: 'camp',
                    spellcastingAbility: null,
                    seenLevel: null,
                    avatar: null,
                    type: 'npc_hero',
                    spellSlots: {},
                },
            },
            { speed: 40 }
        );

        const { data } = h.character.update.mock.calls[0][0];

        expect(data).toMatchObject({
            speed: 40,
            characteristics: { strength: 14, speed: 40 },
        });
    });
});
