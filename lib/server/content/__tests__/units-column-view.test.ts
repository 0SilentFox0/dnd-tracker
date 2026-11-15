import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    campaign: { findUnique: vi.fn() },
    race: { count: vi.fn() },
    spell: { count: vi.fn() },
    unit: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/cache/reference-data', () => ({
    getCachedUnits: vi.fn(async () => []),
}));

import '@/lib/server/systems/registry';
import { ParticipantSide } from '@/lib/constants/battle';
import { createUnitSchema } from '@/lib/schemas/units';
import { unitsResource } from '@/lib/server/content/resources/units';
import type { Actor } from '@/lib/utils/api/actor';
import { createBattleParticipantFromUnit } from '@/lib/utils/battle/participant/from-unit';
import { hashJson } from '@/lib/utils/battle/store/stable-json';
import { parseRules } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems/lookup';
import { toUnitCreateData } from '@/lib/utils/units/import-units';
import { unitCreateData } from '@/lib/utils/units/unit-create-data';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const rules = parseRules({ system: { key: 'dnd5e' } });

const STATS = {
    strength: 14,
    dexterity: 12,
    constitution: 13,
    intelligence: 8,
    wisdom: 10,
    charisma: 16,
    armorClass: 15,
    initiative: 2,
    speed: 35,
};

const actor: Actor = {
    campaignId: 'c1',
    userId: 'u',
    isDM: true,
    via: 'session',
    scopes: null,
};

const unitRow = (over: object) => ({
    id: 'u1',
    campaignId: 'c1',
    name: 'Orc',
    raceId: null,
    level: 3,
    ...STATS,
    gridSize: 1,
    maxHp: 30,
    proficiencyBonus: 2,
    attacks: [],
    knownSpells: [],
    immunities: [],
    abilities: [],
    avatar: null,
    morale: 0,
    maxTargets: 1,
    minTargets: 1,
    characteristics: null,
    createdAt: new Date(0),
    ...over,
});

const stable = <T extends { basicInfo: { id: string } }>(p: T) => ({
    ...p,
    basicInfo: { ...p.basicInfo, id: 'participant' },
});

const build = (row: object) =>
    createBattleParticipantFromUnit(
        row as never,
        'b1',
        ParticipantSide.ENEMY,
        1,
        {},
        rules
    );

describe('units d20 columnView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(Date, 'now').mockReturnValue(1);
        db.campaign.findUnique.mockResolvedValue({ rules });
        db.unit.create.mockResolvedValue({ id: 'u1' });
        db.unit.update.mockResolvedValue({ id: 'u1' });
        db.unit.findUnique.mockResolvedValue({
            characteristics: { extra: 1 },
        });
    });

    it('fromUnit: migrated rows ignore the columns, identical participant and hash', async () => {
        const defaulted = stable(
            await build({
                ...unitRow({ characteristics: { ...STATS } }),
                strength: 10,
                armorClass: 10,
                initiative: 0,
                speed: 30,
            })
        );

        const corrupted = stable(
            await build({
                ...unitRow({ characteristics: { ...STATS } }),
                strength: 1,
                armorClass: 1,
                speed: 1,
            })
        );

        expect(corrupted).toEqual(defaulted);
        expect(hashJson(corrupted)).toBe(hashJson(defaulted));
    });

    it('create writes characteristics and the columns', async () => {
        await unitsResource.create(
            actor,
            createUnitSchema.parse({ name: 'Orc', ...STATS }) as never
        );

        const data = db.unit.create.mock.calls[0][0].data;

        expect(data.characteristics).toEqual(STATS);
        expect(data).toMatchObject(STATS);
    });

    it('patch writes characteristics and the column and keeps unrelated characteristics keys', async () => {
        await unitsResource.update(
            actor,
            {
                id: 'u1',
                knownSpells: [],
                characteristics: { extra: 1 },
            } as never,
            { armorClass: 18 } as never
        );

        const data = db.unit.update.mock.calls[0][0].data;

        expect(data.armorClass).toBe(18);
        expect(data.characteristics).toEqual({ extra: 1, armorClass: 18 });
    });

    it('patch merges into characteristics from the fresh row, not the earlier resource row', async () => {
        db.unit.findUnique.mockResolvedValue({
            characteristics: { intelligence: 17 },
        });

        await unitsResource.update(
            actor,
            { id: 'u1', knownSpells: [], characteristics: { extra: 1 } } as never,
            { armorClass: 18 } as never
        );

        expect(db.unit.findUnique).toHaveBeenCalledWith({
            where: { id: 'u1' },
            select: { characteristics: true },
        });
        expect(db.unit.update.mock.calls.at(-1)?.[0].data.characteristics).toEqual({
            intelligence: 17,
            armorClass: 18,
        });
    });

    it('wfrp keeps its own characteristics untouched', async () => {
        db.campaign.findUnique.mockResolvedValue({ rules: WFRP_RULES });

        await unitsResource.create(
            actor,
            createUnitSchema.parse({
                name: 'X',
                characteristics: DEFAULT_CHARACTERISTICS,
            }) as never
        );

        expect(db.unit.create.mock.calls[0][0].data.characteristics).toEqual(
            DEFAULT_CHARACTERISTICS
        );
    });

    it('unitCreateData / toUnitCreateData with a system write characteristics and the columns', () => {
        const parsed = createUnitSchema.parse({ name: 'Orc', ...STATS });

        expect(unitCreateData('c1', parsed)).not.toHaveProperty(
            'characteristics'
        );

        const created = unitCreateData('c1', parsed, ruleSystemOf(rules));

        expect(created.characteristics).toEqual(STATS);
        expect(created.strength).toBe(STATS.strength);
        expect(
            toUnitCreateData(
                'c1',
                parsed as never,
                null,
                false,
                ruleSystemOf(rules)
            ).characteristics
        ).toEqual(STATS);
    });
});
