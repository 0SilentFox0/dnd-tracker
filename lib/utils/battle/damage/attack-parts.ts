import { ParticipantSourceType } from '@/lib/constants/battle';
import {
    diceAverage,
    diceCount,
    diceSlots,
    mergeDiceFormulas,
    parseDiceLenient,
} from '@/lib/utils/common/dice';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

type SystemRules = Pick<Ruleset, 'system'>;

export interface AttackDamageParts {
    weaponDice: string;
    /** Dice the system's damage parts add on top of the weapon dice */
    extraDice: string;
    formula: string;
    /** Flat damage the system's damage parts add */
    flat: number;
}

export function attackDamageParts(
    p: BattleParticipant,
    attack: BattleAttack,
    rules: SystemRules
): AttackDamageParts {
    const weaponDice = attack.damageDice ?? '';

    const results = (ruleSystemOf(rules).combat.damageParts ?? []).flatMap(
        (part) => part(p, attack) ?? []
    );

    const dice = results.flatMap((r) => r.dice ?? []).filter(Boolean);

    const extraDice = dice.length > 0 ? mergeDiceFormulas(...dice) : '';

    return {
        weaponDice,
        extraDice,
        formula: extraDice
            ? mergeDiceFormulas(weaponDice, extraDice)
            : weaponDice,
        flat: results.reduce((sum, r) => sum + (r.flat ?? 0), 0),
    };
}

/** Розміри кубиків шкоди за зростанням, як у формі гравця; вільний текст юніта («2d6 + STR») читається за першою групою. */
export function damageDiceSlots(
    p: BattleParticipant,
    attack: BattleAttack,
    rules: SystemRules
): number[] {
    const { formula } = attackDamageParts(p, attack, rules);

    const strict = diceSlots(formula);

    if (strict.length || attack.noLevelDice) return strict;

    return parseDiceLenient(formula).groups.flatMap((g) =>
        Array.from({ length: g.count }, () => g.size)
    );
}

export interface AttackDamageContext {
    heroLevelPart: number;
    heroDicePart: number;
    heroDiceNotation: string;
    weaponDiceNotation: string | undefined;
}

/** Клієнт героя кидає зброю разом із кубиками системи; якщо кидків менше — додаткові кубики йдуть середнім. */
export function attackDamageContext(
    p: BattleParticipant,
    attack: BattleAttack,
    damageRolls: number[],
    rules: SystemRules
): AttackDamageContext {
    const { weaponDice, extraDice, formula, flat } = attackDamageParts(
        p,
        attack,
        rules
    );

    const isHero = p.basicInfo.sourceType === ParticipantSourceType.CHARACTER;

    const fullDiceCount = diceCount(weaponDice) + diceCount(extraDice);

    const fullRolls =
        isHero &&
        fullDiceCount > 0 &&
        (damageRolls.length === fullDiceCount ||
            damageRolls.length === 2 * fullDiceCount);

    return {
        heroLevelPart: flat,
        heroDicePart: extraDice && !fullRolls ? diceAverage(extraDice) : 0,
        heroDiceNotation: fullRolls ? '' : extraDice,
        weaponDiceNotation:
            (fullRolls ? formula : '') || weaponDice || undefined,
    };
}
