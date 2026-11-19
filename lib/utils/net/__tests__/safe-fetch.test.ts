import { afterEach, describe, expect, it, vi } from 'vitest';

import { isForbiddenAddress, safeFetchBytes } from '../safe-fetch';

import { API_ERRORS } from '@/lib/constants/api-errors';

const lookupTo =
    (address: string) =>
    (_host: string, _opts: unknown, cb: (...a: unknown[]) => void) =>
        cb(null, [{ address, family: address.includes(':') ? 6 : 4 }]);

const publicLookup = lookupTo('8.8.8.8') as never;

const opts = { maxBytes: 100, timeoutMs: 1000, maxRedirects: 3 };

const redirect = (to: string) =>
    new Response(null, { status: 302, headers: { location: to } });

afterEach(() => vi.unstubAllGlobals());

describe('isForbiddenAddress', () => {
    it.each([
        '127.0.0.1',
        '10.1.2.3',
        '172.16.0.1',
        '192.168.1.1',
        '169.254.169.254',
        '100.64.0.1',
        '0.0.0.0',
        '::1',
        'fc00::1',
        'fe80::1',
        '::ffff:127.0.0.1',
    ])('forbids %s', (ip) => {
        expect(isForbiddenAddress(ip)).toBe(true);
    });

    it.each(['8.8.8.8', '2606:4700::1111'])('allows %s', (ip) => {
        expect(isForbiddenAddress(ip)).toBe(false);
    });
});

describe('safeFetchBytes', () => {
    it('rejects a host resolving to a private IP before fetching', async () => {
        const fetchMock = vi.fn();

        vi.stubGlobal('fetch', fetchMock);

        const r = await safeFetchBytes('http://evil.example/x.mp3', {
            ...opts,
            lookup: lookupTo('10.0.0.5') as never,
        });

        expect(r).toEqual({ ok: false, message: API_ERRORS.SOUND_LINK_INVALID });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects localhost and metadata literals without fetching', async () => {
        const fetchMock = vi.fn();

        vi.stubGlobal('fetch', fetchMock);

        for (const url of [
            'http://localhost/x.mp3',
            'http://169.254.169.254/latest',
        ])
            expect(
                (await safeFetchBytes(url, { ...opts, lookup: publicLookup }))
                    .ok
            ).toBe(false);

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects non-http schemes', async () => {
        const fetchMock = vi.fn();

        vi.stubGlobal('fetch', fetchMock);

        const r = await safeFetchBytes('ftp://example.com/x.mp3', {
            ...opts,
            lookup: publicLookup,
        });

        expect(r.ok).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a redirect into a loopback address', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(redirect('http://127.0.0.1/x'));

        vi.stubGlobal('fetch', fetchMock);

        const r = await safeFetchBytes('http://example.com/a', {
            ...opts,
            lookup: publicLookup,
        });

        expect(r.ok).toBe(false);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('allows 3 redirects but rejects the 4th', async () => {
        const hops = (n: number) => {
            const fetchMock = vi.fn();

            for (let i = 0; i < n; i++)
                fetchMock.mockResolvedValueOnce(
                    redirect(`http://example.com/${i + 1}`)
                );

            fetchMock.mockResolvedValue(new Response(new Uint8Array(4)));
            vi.stubGlobal('fetch', fetchMock);
        };

        hops(3);
        expect(
            (
                await safeFetchBytes('http://example.com/a', {
                    ...opts,
                    lookup: publicLookup,
                })
            ).ok
        ).toBe(true);

        hops(4);
        expect(
            (
                await safeFetchBytes('http://example.com/a', {
                    ...opts,
                    lookup: publicLookup,
                })
            ).ok
        ).toBe(false);
    });

    it('aborts a body that streams past maxBytes', async () => {
        const stream = new ReadableStream<Uint8Array>({
            pull(controller) {
                controller.enqueue(new Uint8Array(60));
            },
        });

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream)));

        const r = await safeFetchBytes('http://example.com/a', {
            ...opts,
            lookup: publicLookup,
        });

        expect(r).toEqual({
            ok: false,
            message: API_ERRORS.SOUND_LINK_TOO_LARGE,
        });
    });

    it('returns bytes and content type', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(new Uint8Array([1, 2, 3]), {
                    headers: { 'content-type': 'audio/mpeg' },
                })
            )
        );

        const r = await safeFetchBytes('https://example.com/a.mp3', {
            ...opts,
            lookup: publicLookup,
        });

        expect(r).toMatchObject({
            ok: true,
            value: { contentType: 'audio/mpeg' },
        });
    });
});
