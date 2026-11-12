import { describe, expect, it } from 'vitest';

import { createBattleParticipantFromUnit } from '@/lib/utils/battle/participant/from-unit';
import { DEFAULT_RULES, type Ruleset } from '@/lib/utils/rules';

const rules = (system: Ruleset['system']): Ruleset => ({
    ...DEFAULT_RULES,
    system,
});

const unit = (extra: object = {}) =>
    ({
        id: 'u1',
        name: 'U',
        level: 3,
        proficiencyBonus: 2,
        hp: 10,
        armorClass: 10,
        speed: 30,
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 14,
        wisdom: 10,
        charisma: 10,
        attacks: [],
        knownSpells: [],
        abilities: [],
        ...extra,
    }) as never;

const dcOf = async (u: never, r: Ruleset) =>
    (
        await createBattleParticipantFromUnit(
            u,
            'b1',
            'enemy' as never,
            0,
            undefined,
            r
        )
    ).spellcasting.spellSaveDC;

describe('d20 unit spell DC', () => {
    it('non-monster: base + proficiency + tier on d20 and homm', async () => {
        const expected = DEFAULT_RULES.formulas.saveDcBase + 2 + 3;

        expect(await dcOf(unit(), rules({ key: 'dnd5e' }))).toBe(expected);
        expect(await dcOf(unit(), rules({ key: 'homm' }))).toBe(expected);
    });

    it('monster: configured dc wins, otherwise best mental ability', async () => {
        expect(
            await dcOf(
                unit({ cr: 1, spellcasting: { dc: 17, spells: [] } }),
                rules({ key: 'dnd5e' })
            )
        ).toBe(17);
        expect(await dcOf(unit({ cr: 1 }), rules({ key: 'dnd5e' }))).toBe(
            DEFAULT_RULES.formulas.saveDcBase + 2 + 2
        );
    });

    it('wfrp unit has no spellSaveDC', async () => {
        expect(await dcOf(unit(), rules({ key: 'wfrp' }))).toBeUndefined();
    });
});
