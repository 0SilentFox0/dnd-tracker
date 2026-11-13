import { attackDamageContext, attackDamageParts } from './attack-parts';
import { applyHeroDmDamageMultiplier } from './hero-dm-multiplier';
import { calculateDamageWithModifiers } from './index';
import { WEAPON_FLAT_LABEL } from './weapon-flat';

import type { AbilityKey } from '@/lib/constants/abilities';
import {
    attackAbilityOf,
    attackDamageModifier,
} from '@/lib/utils/battle/attack/ability';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { diceAverage } from '@/lib/utils/common/dice';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type {
    BattleAttack,
    BattleParticipant,
    DamageStep,
} from '@/types/battle';

export interface AverageDamage {
    total: number;
    statKey: AbilityKey;
    weaponAvg: number;
    heroDice: string;
    heroPart: number;
    statMod: number;
    steps: DamageStep[];
    multiplier: number;
}

export function averageAttackDamage(
    p: BattleParticipant,
    attack: BattleAttack,
    rules: Pick<Ruleset, 'system'>,
    all: BattleParticipant[]
): AverageDamage {
    const type = attackKindOf(attack.type);

    const { weaponDice, extraDice: heroDice } = attackDamageParts(
        p,
        attack,
        rules
    );

    const heroDiceAvg = diceAverage(heroDice);

    const weaponAvg = diceAverage(weaponDice);

    const statMod = attackDamageModifier(p, attack, rules, all);

    const { key: statKey } = attackAbilityOf(rules, p, attack);

    const { heroLevelPart } = attackDamageContext(p, attack, [], rules);

    const calc = calculateDamageWithModifiers(p, weaponAvg, statMod, type, {
        allParticipants: all,
        heroLevelPart,
        heroDicePart: heroDiceAvg,
        heroDiceNotation: heroDice,
        weaponDiceNotation: attack.damageDice ?? undefined,
        statKey,
    });

    const bonus = attack.damageBonus ?? 0;

    const steps = bonus
        ? [
              ...calc.steps,
              {
                  label: WEAPON_FLAT_LABEL,
                  side: 'attacker' as const,
                  kind: 'flat' as const,
                  value: bonus,
                  after: calc.totalDamage + bonus,
              },
          ]
        : calc.steps;

    const dm = applyHeroDmDamageMultiplier(p, type, calc.totalDamage + bonus);

    return {
        total: dm.damage,
        statKey,
        weaponAvg,
        heroDice,
        heroPart: heroLevelPart + heroDiceAvg,
        statMod,
        steps,
        multiplier: dm.multiplier,
    };
}
