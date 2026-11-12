import { describe, expect, it } from 'vitest';

import { EARN_STATUS_DEFAULT } from '../constants';
import { parseStatus } from '../status';

describe('parseStatus', () => {
    it('parses tier and level', () => {
        expect(parseStatus('Silver 3')).toEqual({ tier: 'silver', level: 3 });
        expect(parseStatus('gold 1')).toEqual({ tier: 'gold', level: 1 });
    });

    it.each(['Brass 0', 'Copper 2', '', undefined, null])(
        'falls back for %s',
        (raw) => {
            expect(parseStatus(raw)).toEqual(EARN_STATUS_DEFAULT);
        }
    );
});
