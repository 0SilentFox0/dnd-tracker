import { describe } from 'vitest';

import { expectLabelKeys } from '../test/label-keys';

import { WFRP_CONDITION_KEYS } from '@/systems/wfrp/rules/conditions/catalog';
import { DEFAULT_TABLES } from '@/systems/wfrp/rules/tables/defaults';

describe('wfrp battle labels have translations', () => {
    for (const k of WFRP_CONDITION_KEYS)
        expectLabelKeys('battleWfrp', `conditions.${k}`, [
            'label',
            'description',
        ]);

    expectLabelKeys('battleWfrp', 'damage.steps', [
        'weapon',
        'sb',
        'netSl',
        'tb',
        'ap',
        'ward',
        'size',
        'minimum',
        'crit',
    ]);
    expectLabelKeys('battleWfrp', 'damage', ['total']);
    expectLabelKeys('battleWfrp', 'log', [
        'critHit',
        'critWound',
        'unconscious',
    ]);
    expectLabelKeys(
        'battleWfrp',
        'crit',
        (['head', 'arm', 'body', 'leg'] as const).flatMap((loc) =>
            DEFAULT_TABLES[
                `crit${loc[0].toUpperCase()}${loc.slice(1)}` as 'critHead'
            ].map((_, i) => `${loc}.${i + 1}`)
        )
    );
});
