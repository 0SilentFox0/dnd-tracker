import { describe, expect, it } from 'vitest';

import {
    secondsUntilUtcMidnight,
    SEEN_COOKIE,
    seenValue,
    shouldTouch,
    utcDay,
} from '../seen-cookie';

const now = new Date('2026-11-27T10:00:00Z');

describe('seen cookie', () => {
    it('names the cookie and formats the UTC day', () => {
        expect(SEEN_COOKIE).toBe('cn_seen');
        expect(utcDay(now)).toBe('2026-11-27');
    });

    it('touches when missing, for another user or another day', () => {
        expect(shouldTouch(undefined, 'u1', now)).toBe(true);
        expect(shouldTouch(seenValue('u1', now), 'u1', now)).toBe(false);
        expect(shouldTouch(seenValue('u1', now), 'u2', now)).toBe(true);
        expect(
            shouldTouch(
                seenValue('u1', new Date('2026-11-26T23:00:00Z')),
                'u1',
                now
            )
        ).toBe(true);
    });

    it('never returns less than 60 seconds until midnight', () => {
        expect(secondsUntilUtcMidnight(new Date('2026-11-27T23:59:30Z'))).toBe(
            60
        );
        expect(secondsUntilUtcMidnight(now)).toBe(14 * 3600);
    });
});
