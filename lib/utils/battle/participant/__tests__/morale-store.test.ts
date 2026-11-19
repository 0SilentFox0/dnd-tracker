import { describe, expect, it } from 'vitest';

import '@/lib/server/systems/registry';
import { ParticipantSide } from '@/lib/constants/battle';
import { createBattleParticipantFromCharacter } from '@/lib/server/battles/participant/from-character';
import { createBattleParticipantFromUnit } from '@/lib/utils/battle/participant/from-unit';
import type { UnitFromPrisma } from '@/lib/utils/battle/types/participant';
import { parseRules } from '@/lib/utils/rules/schema';
import { readStoredColumn } from '@/lib/utils/rules/systems/stored-columns';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const rules = parseRules({ system: { key: 'homm' } });

const ext = (value: number) => ({ ext: { morale: { value } } });

const unitRow = (over: object) =>
    ({
        id: 'u1',
        campaignId: 'c1',
        name: 'Goblin',
        raceId: null,
        level: 3,
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        armorClass: 12,
        initiative: 1,
        speed: 30,
        gridSize: 1,
        maxHp: 30,
        proficiencyBonus: 2,
        attacks: [],
        knownSpells: [],
        immunities: [],
        maxTargets: 1,
        minTargets: 1,
        abilities: [],
        levelScaling: null,
        ...over,
    }) as unknown as UnitFromPrisma;

const heroRow = (over: object) => ({
    id: 'ch1',
    campaignId: 'c1',
    name: 'Hero',
    race: 'Human',
    class: 'Fighter',
    level: 1,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    armorClass: 12,
    speed: 30,
    initiative: 0,
    controlledBy: 'u1',
    immunities: [],
    knownSpells: [],
    equipment: {},
    skillTreeProgress: {},
    personalSkillId: null,
    archetype: 'warrior',
    ...over,
});

const context = {
    ext: {},
    spells: [],
    allSkills: [],
    racesByName: {},
    campaign: { maxLevel: 20 },
    skillsById: {},
    artifactsById: {},
} as never;

const unitMorale = async (over: object) =>
    (
        await createBattleParticipantFromUnit(
            unitRow(over),
            'b1',
            ParticipantSide.ENEMY,
            1,
            {},
            rules
        )
    ).combatStats.morale;

const heroMorale = async (over: object) =>
    (
        await createBattleParticipantFromCharacter(
            heroRow(over) as never,
            'b1',
            ParticipantSide.ALLY,
            undefined,
            context,
            { artifactRows: [], rules }
        )
    ).combatStats.morale;

describe('morale ext store in participants (the sheet reads combatStats)', () => {
    it.each([
        ['ext only', { characteristics: ext(2) }],
        ['ext with a stale column', { morale: 5, characteristics: ext(2) }],
    ])('unit and hero read the same value: %s', async (_name, over) => {
        expect(await unitMorale(over)).toBe(2);
        expect(await heroMorale(over)).toBe(2);
    });

    it('ext wins over a stale column', async () => {
        const over = { morale: 1, characteristics: ext(-3) };

        expect(await unitMorale(over)).toBe(-3);
        expect(await heroMorale(over)).toBe(-3);
    });

    it('a legacy column with an empty ext reads as 0', async () => {
        expect(await unitMorale({ morale: 3, characteristics: null })).toBe(0);
        expect(await heroMorale({ morale: 3, characteristics: null })).toBe(0);
    });

    it('missing values read as 0', async () => {
        expect(await unitMorale({ characteristics: null })).toBe(0);
        expect(await heroMorale({ characteristics: null })).toBe(0);
    });

    it('a ruleset without the module reads nothing', () => {
        expect(
            readStoredColumn(
                parseRules(WFRP_RULES),
                { morale: 4, characteristics: ext(1) },
                'morale',
                'number'
            )
        ).toBeUndefined();
    });
});
