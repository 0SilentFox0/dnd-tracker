import { footprintDistance } from './geometry';
import { cellsOf, isOnMap } from './occupancy';
import * as check from './reach-check';

import { AttackType } from '@/lib/constants/battle';
import { isAttackable } from '@/lib/utils/abilities/engine/core/participants';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type {
    BattleAttack,
    BattleMapConfig,
    BattleParticipant,
} from '@/types/battle';
import type { LogLine } from '@/types/text';

export { attackRangeCells, rangeBands } from './reach-check';

const reachOf = (rules: Ruleset) => ruleSystemOf(rules).combat.reach;

export const meleeReachCells = (
    p: BattleParticipant,
    attack: BattleAttack,
    rules: Ruleset
): number => check.meleeReachCells(p, attack, reachOf(rules));

export const rangeDisadvantageReasons = (
    map: BattleMapConfig | null | undefined,
    participants: BattleParticipant[],
    attacker: BattleParticipant,
    attack: BattleAttack,
    target: BattleParticipant,
    rules: Ruleset
): LogLine[] =>
    check.rangeDisadvantageReasons(
        map,
        participants,
        attacker,
        attack,
        target,
        rules,
        reachOf(rules)
    );

export const attackReachError = (
    map: BattleMapConfig | null,
    participants: BattleParticipant[],
    attacker: BattleParticipant,
    attack: BattleAttack,
    targets: BattleParticipant[],
    rules: Ruleset
): LogLine | null =>
    check.attackReachError(
        map,
        participants,
        attacker,
        attack,
        targets,
        rules,
        reachOf(rules)
    );

export function enemiesInReach(
    map: BattleMapConfig | null,
    participants: BattleParticipant[],
    attacker: BattleParticipant,
    attack: BattleAttack,
    rules: Ruleset
): BattleParticipant[] {
    return participants.filter(
        (p) =>
            isHostile(map, attacker, p) &&
            isAttackable(p) &&
            isOnMap(p) &&
            attackReachError(
                map,
                participants,
                attacker,
                attack,
                [p],
                rules
            ) === null
    );
}

/** Ближня атака, якщо дістає; інакше перша досяжна. Без карти чи позиції — перша ближня, інакше перша. */
export function pickAttack(
    map: BattleMapConfig | null,
    participants: BattleParticipant[],
    attacker: BattleParticipant,
    attacks: BattleAttack[],
    target: BattleParticipant,
    rules: Ruleset
): { attack: BattleAttack | null; error: LogLine | null } {
    const isMelee = (a: BattleAttack) =>
        attackKindOf(a.type) === AttackType.MELEE;

    const usable = attacks.filter((a) => a.hand !== 'off');

    let meleeError: LogLine | null = null;

    let rangedError: LogLine | null = null;

    for (const attack of [
        ...usable.filter(isMelee),
        ...usable.filter((a) => !isMelee(a)),
    ]) {
        const e = attackReachError(
            map,
            participants,
            attacker,
            attack,
            [target],
            rules
        );

        if (e === null) return { attack, error: null };

        if (isMelee(attack)) meleeError ??= e;
        else rangedError ??= e;
    }

    // до далекої цілі «підійдіть» менш корисне, ніж причина, чому не стріляє лук
    const adjacent =
        !!target.battleData.position &&
        footprintDistance(cellsOf(attacker), cellsOf(target)) <= 1;

    return {
        attack: null,
        error: adjacent
            ? (meleeError ?? rangedError)
            : (rangedError ?? meleeError),
    };
}
