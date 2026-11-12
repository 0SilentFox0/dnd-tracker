import {
    flagSeg,
    plain,
} from '@/lib/utils/abilities/registry/effects/flag-kit';
import type { SystemFlagRows } from '@/lib/utils/abilities/registry/effects/system-flag-row';
import { signed } from '@/lib/utils/common/format';

export const MORALE_FLAG_ROWS: SystemFlagRows<
    'moraleChance' | 'noNegativeMorale' | 'ignoreMorale' | 'minMorale'
> = {
    moraleChance: {
        fields: [{ name: 'percent', input: 'number' }],
        defaults: { percent: 10 },
        describe: (e) => [flagSeg('moraleChance', { percent: e.percent })],
    },
    noNegativeMorale: plain('noNegativeMorale'),
    ignoreMorale: plain('ignoreMorale'),
    minMorale: {
        fields: [{ name: 'value', input: 'number' }],
        defaults: { value: 1 },
        describe: (e) => [flagSeg('minMorale', { value: signed(e.value) })],
    },
};
