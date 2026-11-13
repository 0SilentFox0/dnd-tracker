import { cellFeetOf } from './cell-feet';
import { footprintDistance } from './geometry';
import { cellsOf, isOnMap } from './occupancy';

import { AttackType } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { hasTrait } from '@/lib/utils/battle/common/weapon-trait';
import {
    isHostile,
    modeEngages,
    modeMeleeBlockedText,
    modeTargetHiddenText,
} from '@/lib/utils/battle/modes/engine';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { ReachRules } from '@/lib/utils/rules/systems/types';
import type {
    BattleAttack,
    BattleMapConfig,
    BattleParticipant,
} from '@/types/battle';
import type { LogLine } from '@/types/text';

/** Reach checks that take the system's reach hook explicitly, for code a rule system itself imports */
export function attackRangeCells(
    range: string | undefined,
    rules: Ruleset
): number | null {
    return rangeBands(range, rules)?.long ?? null;
}

export function meleeReachCells(
    p: BattleParticipant,
    attack: BattleAttack,
    reachRules: ReachRules | undefined
): number {
    if (attack.reachCells) return attack.reachCells;

    return reachRules?.meleeCells(p, attack) ?? 1;
}

export function rangeBands(
    range: string | undefined,
    rules: Ruleset
): { normal: number; long: number } | null {
    const numbers = range?.match(/\d+/g);

    if (!numbers) return null;

    const cells = (n: string) =>
        Math.max(1, Math.floor(Number(n) / cellFeetOf(rules)));

    return {
        normal: cells(numbers[0]),
        long: cells(numbers[numbers.length - 1]),
    };
}

const isThrownMelee = (attack: BattleAttack, rules: Ruleset) =>
    attackKindOf(attack.type) === AttackType.MELEE &&
    hasTrait(attack, 'thrown') &&
    rangeBands(attack.range, rules) !== null;

/** Причини перешкоди дальньої атаки 5e: «Далека дистанція», «Ворог поруч». Без штрафів системи — []. */
export function rangeDisadvantageReasons(
    map: BattleMapConfig | null | undefined,
    participants: BattleParticipant[],
    attacker: BattleParticipant,
    attack: BattleAttack,
    target: BattleParticipant,
    rules: Ruleset,
    reachRules: ReachRules | undefined
): LogLine[] {
    if (
        !map ||
        !reachRules?.rangedPenalties(attacker) ||
        !attacker.battleData.position ||
        !target.battleData.position
    )
        return [];

    const mine = cellsOf(attacker);

    const distance = footprintDistance(mine, cellsOf(target));

    const thrown =
        isThrownMelee(attack, rules) &&
        distance > meleeReachCells(attacker, attack, reachRules);

    if (attackKindOf(attack.type) !== AttackType.RANGED && !thrown) return [];

    const reasons: LogLine[] = [];

    const bands = rangeBands(attack.range, rules);

    if (bands && distance > bands.normal)
        reasons.push(textRef('battleLog.rollMode.farRange'));

    const engaged = participants.some(
        (p) =>
            isHostile(map, attacker, p) &&
            isOnMap(p) &&
            footprintDistance(mine, cellsOf(p)) <= 1 &&
            modeEngages(map, attacker, p)
    );

    if (engaged && !thrown)
        reasons.push(textRef('battleLog.rollMode.enemyNear'));

    return reasons;
}

export function attackReachError(
    map: BattleMapConfig | null,
    participants: BattleParticipant[],
    attacker: BattleParticipant,
    attack: BattleAttack,
    targets: BattleParticipant[],
    rules: Ruleset,
    reachRules: ReachRules | undefined
): LogLine | null {
    if (!map || !attacker.battleData.position) return null;

    const mine = cellsOf(attacker);

    const distanceTo = (p: BattleParticipant) =>
        footprintDistance(mine, cellsOf(p));

    const placed = targets.filter((t) => t.battleData.position);

    const penalties = reachRules?.rangedPenalties(attacker) ?? false;

    if (attackKindOf(attack.type) === AttackType.MELEE) {
        const reach = meleeReachCells(attacker, attack, reachRules);

        const bands =
            penalties && isThrownMelee(attack, rules)
                ? rangeBands(attack.range, rules)
                : null;

        const tooFar = placed.find((t) => distanceTo(t) > reach);

        if (tooFar) {
            if (!bands) return textRef(REJECT.targetNotNear);

            if (placed.some((t) => distanceTo(t) > bands.long))
                return textRef(REJECT.targetOutOfAttackRange);

            return modeTargetHiddenText(map, attacker, placed);
        }

        return (
            placed
                .map((t) => modeMeleeBlockedText(map, attacker, t))
                .find(Boolean) ?? null
        );
    }

    const engaged =
        !penalties &&
        !attack.ignoresEngagement &&
        participants.some(
            (p) =>
                isHostile(map, attacker, p) &&
                isOnMap(p) &&
                distanceTo(p) <= 1 &&
                modeEngages(map, attacker, p)
        );

    if (engaged) return textRef(REJECT.enemyNearNoShoot);

    const range = attackRangeCells(attack.range, rules);

    if (range !== null && placed.some((t) => distanceTo(t) > range))
        return textRef(REJECT.targetOutOfAttackRange);

    return modeTargetHiddenText(map, attacker, placed);
}
