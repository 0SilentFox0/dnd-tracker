import { rollSlot, rowText } from '../tables/resolve';
import type { PeriodSummary } from './types';

import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { WfrpConditionKey } from '@/systems/wfrp/constants/conditions';

export function rollEvent(
    rules: Pick<Ruleset, 'tables'>,
    rng: Rng,
    preset?: number
): NonNullable<PeriodSummary['event']> {
    const { index, row, roll } = rollSlot(rules, 'downtimeEvent', rng, preset);

    let wounds = 0;

    const conditions: { key: WfrpConditionKey; levels: number }[] = [];

    for (const e of row.effects) {
        if (e.type === 'wounds') wounds += e.amount;
        else if (e.type === 'condition')
            conditions.push({ key: e.key, levels: e.levels });
    }

    return {
        roll,
        index,
        text: rowText(row),
        ...(wounds > 0 ? { wounds } : {}),
        conditions,
    };
}
