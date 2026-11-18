import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from '../route';

const post = (body: string, type = 'application/csp-report') =>
    POST(
        new Request('http://x/api/csp-report', {
            method: 'POST',
            headers: { 'content-type': type },
            body,
        })
    );

afterEach(() => vi.restoreAllMocks());

describe('POST /api/csp-report', () => {
    it('logs a compact line without query strings', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const res = await post(
            JSON.stringify({
                'csp-report': {
                    'document-uri': 'https://a.test/campaigns/1?token=secret',
                    'violated-directive': 'script-src',
                    'blocked-uri': 'inline',
                },
            })
        );

        expect(res.status).toBe(204);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).not.toContain('secret');
        expect(String(warn.mock.calls[0][0])).toContain('script-src');
    });

    it('accepts reports+json arrays', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const res = await post(
            JSON.stringify([
                { body: { effectiveDirective: 'img-src', blockedURL: 'x' } },
            ]),
            'application/reports+json'
        );

        expect(res.status).toBe(204);
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it('rejects malformed and oversized bodies', async () => {
        expect((await post('{nope')).status).toBe(400);
        expect((await post('x'.repeat(9000))).status).toBe(413);
    });

    it('strips control characters so a report cannot forge log lines', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await post(
            JSON.stringify({
                'csp-report': {
                    'violated-directive': 'script-src\n[csp-report] fake\r',
                    'blocked-uri': 'not a url\nforged',
                },
            })
        );

        const logged = String(warn.mock.calls[0][0]);

        expect(logged).not.toMatch(/[\r\n]/);
    });
});
