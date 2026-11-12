import { FESTERING_FAIL_WOUNDS, FESTERING_RENEW_DAYS } from './constants';
import { rollDowntimeTest } from './roll';
import type { Ailment, PeriodSummary } from './types';

import type { Rng } from '@/lib/utils/common/rng';

export function tickAilments(
    ailments: Ailment[],
    days: number,
    ctx: { endurance: number; rng: Rng; presetRolls?: number[] }
): { ailments: Ailment[]; report: PeriodSummary['ailments']; wounds: number } {
    const kept: Ailment[] = [];

    const report: PeriodSummary['ailments'] = [];

    let wounds = 0;

    let tests = 0;

    for (const a of ailments) {
        const left = a.daysLeft - days;

        const base = { id: a.id, label: a.label, kind: a.kind };

        if (left > 0) {
            kept.push({ ...a, daysLeft: left });
            report.push({ ...base, daysLeft: left });
        } else if (a.kind !== 'festering') {
            report.push({ ...base, daysLeft: 0, expired: true });
        } else {
            const { test, passed } = rollDowntimeTest(
                ctx.endurance,
                ctx.rng,
                ctx.presetRolls?.[tests++]
            );

            if (passed) {
                report.push({ ...base, daysLeft: 0, expired: true, test });
            } else {
                kept.push({ ...a, daysLeft: FESTERING_RENEW_DAYS });
                report.push({
                    ...base,
                    daysLeft: FESTERING_RENEW_DAYS,
                    test,
                    wounds: FESTERING_FAIL_WOUNDS,
                });
                wounds += FESTERING_FAIL_WOUNDS;
            }
        }
    }

    return { ailments: kept, report, wounds };
}
