import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { createBattleParticipantFromCharacter } from '@/lib/server/battles/participant/from-character';
import { CHARACTER_OPERATIONS } from '@/lib/server/characters/operations/registry';
import { hashJson } from '@/lib/utils/battle/store/stable-json';
import { parseRules } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import {
    withColumnView,
    withStoredColumns,
} from '@/lib/utils/rules/systems/column-view';

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

describe('fromCharacter reads characteristics, then the column', () => {
    it('rows with all nine keys ignore the columns: identical snapshot and hash', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(1);

        const defaulted = stable(
            await build({
                ...row({ ...STATS }),
                strength: 10,
                armorClass: 10,
                initiative: 0,
                speed: 30,
            })
        );

        const corrupted = stable(
            await build({
                ...row({ ...STATS }),
                strength: 1,
                armorClass: 1,
                speed: 1,
            })
        );

        expect(corrupted).toEqual(defaulted);
        expect(hashJson(corrupted)).toBe(hashJson(defaulted));
    });

    it('partial characteristics fall back to the column for missing keys', async () => {
        const partial = stable(
            await build({ ...row({ strength: 18 }), strength: 14, speed: 99 })
        );

        expect(partial.abilities.strength).toBe(18);
        expect(partial.combatStats.speed).toBe(99);
    });

    it.each([null, {}])(
        'S-A legacy characteristics %s reads like S-B characteristics through all views',
        async (characteristics) => {
            const legacy = {
                ...row(characteristics ?? {}),
                characteristics,
            };

            const migrated = {
                ...row({ ...STATS }),
                strength: 1,
                armorClass: 1,
                initiative: -5,
                speed: 1,
            };

            const legacyParticipant = stable(await build(legacy));

            const migratedParticipant = stable(await build(migrated));

            expect(legacyParticipant).toEqual(migratedParticipant);
            expect(withStoredColumns(legacy)).toMatchObject(STATS);
            expect(withStoredColumns(migrated)).toMatchObject(STATS);
            expect(
                withColumnView(legacy, ruleSystemOf(rules))
            ).toMatchObject(STATS);
            expect(
                withColumnView(migrated, ruleSystemOf(rules))
            ).toMatchObject(STATS);
        }
    );

    it('partial characteristics resolve the same values through all views', async () => {
        const partial = {
            ...row({ strength: 18 }),
            strength: 14,
            speed: 99,
        };

        const participant = stable(await build(partial));

        const expected = {
            ...STATS,
            strength: 18,
            speed: 99,
        };

        expect(participant.abilities.strength).toBe(expected.strength);
        expect(participant.combatStats.speed).toBe(expected.speed);
        expect(withStoredColumns(partial)).toMatchObject(expected);
        expect(withColumnView(partial, ruleSystemOf(rules))).toMatchObject(
            expected
        );
    });

    it('a row written by dual-write is read alike by builder, to-unit-style overlay and sheet loader', async () => {
        const written = row({ ...STATS });

        const viaBuilder = stable(await build(written));

        expect(viaBuilder.abilities.strength).toBe(STATS.strength);
        expect(viaBuilder.combatStats.speed).toBe(STATS.speed);
        expect(withStoredColumns(written)).toMatchObject(STATS);
        expect(withColumnView(written, ruleSystemOf(rules))).toMatchObject(
            STATS
        );
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
        async ({ data }: { data: object }) => ({
            id: 'hero',
            level: 1,
            ...data,
        })
    );
    h.$queryRaw.mockResolvedValue([]);
    h.characterInventory.create.mockResolvedValue({});
    h.race.findFirst.mockResolvedValue(null);
});

describe('d20 dual-writes the columns and characteristics', () => {
    it('create writes the columns and characteristics', async () => {
        await run('create', gate, {
            name: 'Hero',
            type: 'npc_hero',
            controlledBy: 'dm',
            race: 'Людина',
            class: 'Воїн',
            ...STATS,
        });

        const { data } = h.character.create.mock.calls[0][0];

        expect(data.characteristics).toEqual(STATS);
        expect(data).toMatchObject(STATS);
    });

    it('patch merges the change into previous characteristics and writes the column', async () => {
        h.character.findUnique.mockResolvedValue(
            row({ strength: 17, speed: 30 }) as never
        );

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

        expect(data.characteristics).toEqual({ strength: 17, speed: 40 });
        expect(data.speed).toBe(40);
    });
});
