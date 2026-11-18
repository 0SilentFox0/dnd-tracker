import { exhaustionEffects } from './exhaustion';

import { MAX_EXHAUSTION } from '@/lib/constants/exhaustion';
import { DEFAULT_RULES_EDITION } from '@/lib/constants/rules';
import {
    findParticipant,
    replaceParticipant,
    withActiveEffects,
} from '@/lib/utils/abilities/engine/core/participants';
import {
    type CustomConditionKey,
    isCustomConditionKey,
    type StandardConditionKey,
} from '@/lib/utils/abilities/schema/kinds';
import { hasEffectMarker } from '@/lib/utils/battle/participant/state';
import { allConditionKeys } from '@/lib/utils/rules/systems/lookup';
import type { ActiveEffect, BattleParticipant } from '@/types/battle';

const carries = (e: ActiveEffect, key: string) =>
    e.effects.some((m) => m.type === key);

export function hasCondition(
    p: BattleParticipant,
    key: StandardConditionKey
): boolean {
    return hasEffectMarker(p, key);
}

export function conditionSourceIds(
    p: BattleParticipant,
    key: StandardConditionKey
): string[] {
    return p.battleData.activeEffects.flatMap((e) =>
        e.source && carries(e, key) ? [e.source.participantId] : []
    );
}

export function exhaustionLevel(p: BattleParticipant): number {
    const sum = p.battleData.activeEffects.reduce(
        (acc, e) =>
            acc +
            e.effects
                .filter((m) => m.type === 'exhaustion')
                .reduce((a, m) => a + m.value, 0),
        0
    );

    return Math.min(MAX_EXHAUSTION, sum);
}

export function restoreExhaustionHp(
    p: BattleParticipant,
    removed: ActiveEffect[]
): BattleParticipant {
    const back = removed.reduce(
        (acc, e) => acc + (e.exhaustionHpHalved ?? 0),
        0
    );

    if (back <= 0) return p;

    return {
        ...p,
        combatStats: { ...p.combatStats, maxHp: p.combatStats.maxHp + back },
    };
}

export function syncExhaustion(p: BattleParticipant): BattleParticipant {
    const stacks = p.battleData.activeEffects.filter((e) =>
        carries(e, 'exhaustion')
    );

    if (!stacks.length) return p;

    const variant =
        stacks.find((e) => e.exhaustionVariant)?.exhaustionVariant ??
        DEFAULT_RULES_EDITION;

    const derived = exhaustionEffects(exhaustionLevel(p), variant);

    const oldest = stacks[0];

    return withActiveEffects(p, (list) =>
        list.map((e) => {
            if (!stacks.includes(e)) return e;

            const { abilityEffects: _drop, ...rest } = e;

            return e === oldest && derived.length
                ? { ...rest, abilityEffects: derived }
                : rest;
        })
    );
}

export function removeEffects(
    p: BattleParticipant,
    pred: (e: ActiveEffect) => boolean
): { participant: BattleParticipant; removed: ActiveEffect[] } {
    const direct = p.battleData.activeEffects.filter(pred);

    if (!direct.length) return { participant: p, removed: direct };

    const ids = new Set(direct.map((e) => e.id));

    const gone = (e: ActiveEffect) =>
        pred(e) || (!!e.linkedTo && ids.has(e.linkedTo));

    const removed = p.battleData.activeEffects.filter(gone);

    const stripped = withActiveEffects(p, (list) =>
        list.filter((e) => !gone(e))
    );

    return {
        participant: removed.some((e) => carries(e, 'exhaustion'))
            ? syncExhaustion(restoreExhaustionHp(stripped, removed))
            : stripped,
        removed,
    };
}

const isStandardConditionEffect = (e: ActiveEffect) =>
    e.type === 'condition' &&
    (isCustomConditionKey(e.effects[0]?.type) ||
        allConditionKeys().includes(e.effects[0]?.type));

export function conditionEffects(
    p: BattleParticipant
): { key: StandardConditionKey | CustomConditionKey; effect: ActiveEffect }[] {
    return p.battleData.activeEffects.flatMap((effect) =>
        isStandardConditionEffect(effect)
            ? [
                  {
                      key: effect.effects[0].type as
                          | StandardConditionKey
                          | CustomConditionKey,
                      effect,
                  },
              ]
            : []
    );
}

export function hasAnyStandardCondition(p: BattleParticipant): boolean {
    return p.battleData.activeEffects.some(isStandardConditionEffect);
}

export function removeStandardCondition(
    ps: BattleParticipant[],
    id: string,
    key: StandardConditionKey | CustomConditionKey
): { participants: BattleParticipant[]; removed: ActiveEffect[] } {
    const target = findParticipant(ps, id);

    if (!target) return { participants: ps, removed: [] };

    const own = new Set(
        conditionEffects(target)
            .filter((c) => c.key === key)
            .map((c) => c.effect)
    );

    const { participant, removed } = removeEffects(target, (e) => own.has(e));

    return {
        participants: removed.length ? replaceParticipant(ps, participant) : ps,
        removed,
    };
}
