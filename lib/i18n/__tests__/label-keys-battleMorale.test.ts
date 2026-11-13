import { describe } from 'vitest';

import { expectLabelKeys } from '../test/label-keys';

describe('morale battle labels have translations', () => {
    expectLabelKeys('battleMorale', 'outcome', ['none', 'extra', 'skip']);
    expectLabelKeys('battleMorale', '', [
        'extraTitle',
        'extraText',
        'detail',
        'toBattle',
        'skipTitle',
        'skipText',
        'checkD10',
        'extraOn',
        'skipOn',
        'badge',
        'unchanged',
        'strip',
    ]);
});
