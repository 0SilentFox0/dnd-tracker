import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { withSelf } from '@/lib/utils/abilities/engine/core/participants';
import { attackSourceOf } from '@/lib/utils/battle/attack/source';
import { applyMainActionUsed } from '@/lib/utils/battle/participant/helpers';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

export function attacksPerAction(
    p: BattleParticipant,
    participants: BattleParticipant[]
): number {
    const { entries } = collectModifiers(
        withSelf(participants, p),
        p.basicInfo.id,
        { stat: 'attacksPerAction' }
    );

    // Extra Attack does not stack across classes: sum within a class, take the best class.
    const perClass = new Map<string, number>();

    let other = 0;

    for (const e of entries) {
        if (e.sourceType !== 'class') other += e.flat;
        else {
            const key = JSON.stringify(e.source);

            perClass.set(key, (perClass.get(key) ?? 0) + e.flat);
        }
    }

    return Math.max(
        0,
        Math.floor(other + Math.max(0, ...perClass.values()))
    );
}

export const hasPoolAttack = (p: BattleParticipant): boolean =>
    (p.battleData.attacksLeft ?? 0) > 0;

export const hasBoundAttack = (p: BattleParticipant): boolean =>
    (p.battleData.boundAttacks ?? []).some((b) => b.left > 0);

export const canAttackFromPool = (p: BattleParticipant): boolean =>
    hasPoolAttack(p) || hasBoundAttack(p);

/** Index of the bound entry this attack may spend, or -1 */
export function boundAttackFor(
    p: BattleParticipant,
    attack: BattleAttack
): number {
    const { attackSourceId } = attackSourceOf(attack);

    return attackSourceId
        ? (p.battleData.boundAttacks ?? []).findIndex(
              (b) => b.sourceId === attackSourceId && b.left > 0
          )
        : -1;
}

export const canAttackWithBound = (
    p: BattleParticipant,
    attack: BattleAttack
): boolean => boundAttackFor(p, attack) >= 0;

export function grantBoundAttacks(
    p: BattleParticipant,
    sourceId: string,
    n: number
): BattleParticipant {
    const list = p.battleData.boundAttacks ?? [];

    const found = list.find((b) => b.sourceId === sourceId);

    return {
        ...p,
        battleData: {
            ...p.battleData,
            boundAttacks: found
                ? list.map((b) =>
                      b === found ? { ...b, left: b.left + n } : b
                  )
                : [...list, { sourceId, left: n }],
        },
    };
}

export function spendBoundAttack(
    p: BattleParticipant,
    attack: BattleAttack
): BattleParticipant {
    const index = boundAttackFor(p, attack);

    const left = (p.battleData.boundAttacks ?? [])
        .map((b, i) => (i === index ? { ...b, left: b.left - 1 } : b))
        .filter((b) => b.left > 0);

    return {
        ...p,
        battleData: {
            ...p.battleData,
            boundAttacks: left.length ? left : undefined,
        },
    };
}

export function attackCounter(
    p: BattleParticipant,
    participants: BattleParticipant[]
): { n: number; m: number } | null {
    const m = 1 + attacksPerAction(p, participants);

    if (m < 2) return null;

    const left = p.battleData.attacksLeft ?? 0;

    return {
        n:
            left > 0
                ? Math.min(m, m - left + 1)
                : p.actionFlags.hasUsedAction
                  ? m
                  : 1,
        m,
    };
}

export function spendFromPool(
    p: BattleParticipant,
    participants: BattleParticipant[]
): BattleParticipant {
    return hasPoolAttack(p)
        ? {
              ...p,
              battleData: {
                  ...p.battleData,
                  attacksLeft: (p.battleData.attacksLeft ?? 0) - 1,
              },
          }
        : withAttacksLeft(
              applyMainActionUsed(p),
              attacksPerAction(p, participants)
          );
}

export function withAttacksLeft(
    p: BattleParticipant,
    attacksLeft: number
): BattleParticipant {
    return attacksLeft > 0
        ? { ...p, battleData: { ...p.battleData, attacksLeft } }
        : p;
}
