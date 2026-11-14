import { describe, expect, it } from 'vitest';

import { ifNoneMatch, weakEtag } from '@/lib/utils/api/etag';

const req = (h?: string) =>
    new Request('http://x', h ? { headers: { 'if-none-match': h } } : {});

describe('etag', () => {
    it('builds a weak tag', () => expect(weakEtag('m1', 3)).toBe('W/"m1-3"'));

    it('304 on match, weak or strong form, list and wildcard', () => {
        const tag = weakEtag('m1', 3);

        expect(ifNoneMatch(req(tag), tag)?.status).toBe(304);
        expect(ifNoneMatch(req('"m1-3"'), tag)?.status).toBe(304);
        expect(ifNoneMatch(req('W/"a-1", W/"m1-3"'), tag)?.status).toBe(304);
        expect(ifNoneMatch(req('*'), tag)?.status).toBe(304);
    });

    it('null on mismatch or missing header', () => {
        expect(ifNoneMatch(req('W/"m1-2"'), 'W/"m1-3"')).toBeNull();
        expect(ifNoneMatch(req(), 'W/"m1-3"')).toBeNull();
    });
});
