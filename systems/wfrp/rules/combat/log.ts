import type { PercentileAttackDetails } from '../percentile/details';

import { textRef } from '@/lib/i18n/text-ref';
import type { LogLine } from '@/types/text';

export function percentileLines(
    p: PercentileAttackDetails | undefined,
    isHit: boolean
): LogLine[] {
    if (!p) return [];

    const main = textRef(
        p.defender
            ? 'battleLog.percentile.opposed'
            : 'battleLog.percentile.test',
        {
            roll: p.roll,
            target: p.target,
            sl: p.sl,
            defRoll: p.defender?.roll ?? 0,
            defTarget: p.defender?.target ?? 0,
            defSl: p.defender?.sl ?? 0,
            defense: p.defender
                ? textRef(`battleLog.percentile.defense.${p.defender.kind}`)
                : '',
            netSl: p.netSl,
        }
    );

    return p.doubles && !isHit
        ? [main, textRef('battleLog.percentile.doublesMiss')]
        : [main];
}
