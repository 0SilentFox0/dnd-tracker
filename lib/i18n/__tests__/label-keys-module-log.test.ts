import { describe } from 'vitest';

import { expectLabelKeys } from '../test/label-keys';

describe('module log texts have translations', () => {
    expectLabelKeys('moraleLog', '', ['rejectFirst', 'actionKind']);
    expectLabelKeys('moraleLog', 'check', [
        'ignored',
        'neutral',
        'leadership',
        'detail',
        'extra',
        'noExtra',
        'skip',
        'noSkip',
        'notFound',
    ]);
    expectLabelKeys('retaliationLog', '', [
        'title',
        'noun',
        'result',
        'actionKind',
    ]);
    expectLabelKeys('lairLog', '', [
        'dmIn',
        'dmOut',
        'use',
        'run',
        'rejectAbility',
        'round',
    ]);
    expectLabelKeys('inspirationLog', '', ['rollMode']);
});
