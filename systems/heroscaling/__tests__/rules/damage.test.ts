import { describe, expect, it } from 'vitest';

import { heroLevelDamage } from '../../rules/damage';

import { AttackType } from '@/lib/constants/battle';
import { getHeroDamageDiceForLevel } from '@/lib/constants/hero-scaling';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { attackDamageParts } from '@/lib/utils/battle/damage/attack-parts';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { defaultRulesFor } from '@/lib/utils/rules/section-registry';
import type { BattleAttack } from '@/types/battle';

const base = createMockParticipant();

const hero = createMockParticipant({
    abilities: { ...base.abilities, level: 5 },
});

const unit = createMockParticipant({
    basicInfo: { ...base.basicInfo, sourceType: 'unit' },
    abilities: { ...base.abilities, level: 5 },
});

const sword: BattleAttack = {
    id: 's',
    name: 'Меч',
    type: AttackType.MELEE,
    attackBonus: 0,
    damageDice: '1d8',
    damageType: 'slashing',
};

const bare = {
    ...DEFAULT_RULES,
    system: { key: 'dnd5e' },
} as Ruleset;

describe('heroLevelDamage', () => {
    it('gives a hero the level dice and +level', () => {
        expect(heroLevelDamage(hero, sword)).toEqual({
            dice: getHeroDamageDiceForLevel(5, AttackType.MELEE),
            flat: 5,
        });
    });

    it('keeps the flat level but drops the dice for noLevelDice attacks', () => {
        expect(heroLevelDamage(hero, { ...sword, noLevelDice: true })).toEqual({
            dice: '',
            flat: 5,
        });
    });

    it('gives nothing to units and to 5e-model characters', () => {
        expect(heroLevelDamage(unit, sword)).toBeNull();
        expect(
            heroLevelDamage(
                {
                    ...hero,
                    abilities: { ...hero.abilities, damageModel: '5e' },
                },
                sword
            )
        ).toBeNull();
    });

    it('is part of the formula only when the heroscaling module is composed', () => {
        expect(attackDamageParts(hero, sword, DEFAULT_RULES)).toMatchObject({
            flat: 5,
            extraDice: getHeroDamageDiceForLevel(5, AttackType.MELEE),
        });
        expect(attackDamageParts(hero, sword, bare)).toEqual({
            weaponDice: '1d8',
            extraDice: '',
            formula: '1d8',
            flat: 0,
        });
    });

    it('golden: a classless level-5 hero of bare dnd5e has no level dice and no +level, with heroscaling it has both', () => {
        const withModules = (modules: string[]) =>
            defaultRulesFor({ key: 'dnd5e', modules });

        expect(attackDamageParts(hero, sword, withModules([]))).toEqual({
            weaponDice: '1d8',
            extraDice: '',
            formula: '1d8',
            flat: 0,
        });
        expect(
            attackDamageParts(hero, sword, withModules(['heroscaling']))
        ).toMatchObject({
            flat: 5,
            extraDice: getHeroDamageDiceForLevel(5, AttackType.MELEE),
        });
    });
});
