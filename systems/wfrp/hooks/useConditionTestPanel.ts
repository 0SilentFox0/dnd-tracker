'use client';

import { isSystemActionPending, useBattleScene } from '@/lib/hooks/battle';
import { dynamicTextRef } from '@/lib/i18n/text-ref';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { conditionTestOp, fortuneConditionOp } from '@/systems/wfrp/api/battle';
import { fateSpendsOn } from '@/systems/wfrp/rules/combat/fate';
import { wfrpState } from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export interface ConditionTestItem {
    key: string;
    label: LogLine;
    stand: boolean;
    testable: boolean;
}

export interface ConditionTestPanel {
    items: ConditionTestItem[];
    attempt(key: string, roll?: number): void;
    removeWithFortune(key: string): void;
    canRemoveWithFortune: boolean;
    isPending: boolean;
}

/** Null unless the system has conditions, it is the bearer's turn and some condition still allows an end test or a Fortune removal. */
export function useConditionTestPanel(
    hero: BattleParticipant
): ConditionTestPanel | null {
    const { battle, turn, actions } = useBattleScene();

    const conditions = ruleSystemOf(battle.rules).conditions;

    if (!conditions || turn.current?.basicInfo.id !== hero.basicInfo.id)
        return null;

    const tried = wfrpState(hero).conditionTests ?? [];

    const canRemoveWithFortune =
        fateSpendsOn(battle.rules) && (wfrpState(hero).fortune ?? 0) >= 1;

    const items = conditions
        .list(hero)
        .flatMap(({ key }): ConditionTestItem[] => {
            const info = conditions.catalog.find((c) => c.key === key);

            const testable = !!info?.endTest && !tried.includes(key);

            if (!info || (!testable && !canRemoveWithFortune)) return [];

            return [
                {
                    key,
                    label: dynamicTextRef(info.label),
                    stand: info.endTest === 'stand',
                    testable,
                },
            ];
        });

    if (items.length === 0) return null;

    return {
        items,
        attempt: (key, roll) =>
            actions.system.mutate(
                conditionTestOp({
                    participantId: hero.basicInfo.id,
                    condition: key,
                    ...(roll === undefined ? { serverRoll: true } : { roll }),
                })
            ),
        removeWithFortune: (key) =>
            actions.system.mutate(fortuneConditionOp(hero.basicInfo.id, key)),
        canRemoveWithFortune,
        isPending:
            isSystemActionPending(actions.system, 'condition-test') ||
            isSystemActionPending(actions.system, 'fortune-condition'),
    };
}
