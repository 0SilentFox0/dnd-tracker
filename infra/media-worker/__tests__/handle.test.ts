import { describe, expect, it, vi } from 'vitest';

import { handle } from '../src/index';

const ENV = { ORIGIN: 'https://proj.supabase.co' };

const PATH = '/storage/v1/object/public/unit-icons/a%20b.webp';

const req = (path: string, init?: RequestInit) =>
    new Request(`https://media.example.workers.dev${path}`, init);

describe('media worker handle', () => {
    it('rejects non-GET/HEAD methods with 405', async () => {
        const origin = vi.fn();

        const res = await handle(req(PATH, { method: 'POST' }), ENV, origin);

        expect(res.status).toBe(405);
        expect(res.headers.get('allow')).toBe('GET, HEAD');
        expect(origin).not.toHaveBeenCalled();
    });

    it('returns 404 for paths outside the public object prefix', async () => {
        const origin = vi.fn();

        const res = await handle(req('/auth/v1/user'), ENV, origin);

        expect(res.status).toBe(404);
        expect(origin).not.toHaveBeenCalled();
    });

    it('proxies path and query to the origin, adds CORS, strips cookies', async () => {
        const origin = vi.fn(
            async () =>
                new Response('img', {
                    status: 200,
                    headers: { 'set-cookie': 'a=b', 'content-type': 'image/webp' },
                })
        );

        const res = await handle(req(`${PATH}?t=1`), ENV, origin);

        expect(origin).toHaveBeenCalledWith(
            `${ENV.ORIGIN}${PATH}?t=1`,
            expect.objectContaining({ method: 'GET' })
        );
        expect(res.status).toBe(200);
        expect(res.headers.get('access-control-allow-origin')).toBe('*');
        expect(res.headers.get('set-cookie')).toBeNull();
        expect(res.headers.get('content-type')).toBe('image/webp');
    });

    it('forwards Range and passes a 206 through', async () => {
        const origin = vi.fn(async (_url: string, _init: RequestInit) => new Response('x', { status: 206 }));

        const res = await handle(
            req(PATH, { headers: { range: 'bytes=0-99' } }),
            ENV,
            origin
        );

        const init = origin.mock.calls[0][1] as RequestInit;

        expect(new Headers(init.headers).get('range')).toBe('bytes=0-99');
        expect(res.status).toBe(206);
    });

    it('asks Cloudflare to cache 2xx for a year, 404 briefly, 5xx never', async () => {
        const origin = vi.fn(async (_url: string, _init: RequestInit) => new Response('x'));

        await handle(req(PATH), ENV, origin);

        const init = origin.mock.calls[0][1] as { cf: Record<string, unknown> };

        expect(init.cf.cacheEverything).toBe(true);
        expect(init.cf.cacheTtlByStatus).toEqual({
            '200-299': 31536000,
            404: 60,
            '500-599': 0,
        });
    });
});
