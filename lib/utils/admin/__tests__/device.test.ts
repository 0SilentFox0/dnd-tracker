import { describe, expect, it } from 'vitest';

import { parseDevice } from '../device';

describe('parseDevice', () => {
    it.each([
        [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Chrome · Windows',
        ],
        [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Safari · iOS',
        ],
        [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
            'Edge · macOS',
        ],
        [
            'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Firefox · Linux',
        ],
        [
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36 OPR/80.0',
            'Opera · Android',
        ],
        ['curl/8.0', 'Other · Other'],
    ])('%s', (ua, expected) => {
        expect(parseDevice(ua)).toBe(expected);
    });

    it('returns null for empty input', () => {
        expect(parseDevice(null)).toBeNull();
        expect(parseDevice('')).toBeNull();
    });
});
