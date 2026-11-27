import { describe, expect, it } from 'vitest';

import { formatTrackDuration } from '../track-duration';

describe('formatTrackDuration', () => {
    it('formats minutes and padded seconds', () => {
        expect(formatTrackDuration(125)).toBe('2:05');
        expect(formatTrackDuration(61)).toBe('1:01');
    });

    it('returns null when unknown', () => {
        expect(formatTrackDuration(null)).toBeNull();
        expect(formatTrackDuration(0)).toBeNull();
    });
});
