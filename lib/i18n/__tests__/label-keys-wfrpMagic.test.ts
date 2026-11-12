import { describe } from 'vitest';

import { expectLabelKeys } from '../test/label-keys';

import { DEFAULT_TABLES } from '@/systems/wfrp/rules/tables/defaults';

describe('wfrp magic labels have translations', () => {
    expectLabelKeys('wfrpMagic', 'log', [
        'miscast',
        'castSuccess',
        'castFail',
        'castCritical',
        'channelSuccess',
        'channelFail',
    ]);

    for (const [kind, rows] of Object.entries({
        minor: DEFAULT_TABLES.miscastMinor,
        major: DEFAULT_TABLES.miscastMajor,
    }))
        expectLabelKeys(
            'wfrpMagic',
            `miscast.${kind}`,
            rows.map((_, i) => `${i + 1}`)
        );
});
