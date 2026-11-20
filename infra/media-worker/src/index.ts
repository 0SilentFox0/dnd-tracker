const PREFIX = '/storage/v1/object/public/';

interface Env {
    ORIGIN: string;
}

type FetchOrigin = (
    url: string,
    init: RequestInit & { cf?: Record<string, unknown> }
) => Promise<Response>;

export async function handle(
    request: Request,
    env: Env,
    fetchOrigin: FetchOrigin = fetch
): Promise<Response> {
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'access-control-allow-origin': '*',
                'access-control-allow-methods': 'GET, HEAD, OPTIONS',
                'access-control-allow-headers': 'range',
                'access-control-max-age': '86400',
            },
        });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method Not Allowed', {
            status: 405,
            headers: { allow: 'GET, HEAD' },
        });
    }

    const url = new URL(request.url);

    if (!url.pathname.startsWith(PREFIX)) {
        return new Response('Not Found', { status: 404 });
    }

    const headers = new Headers();

    const range = request.headers.get('range');

    if (range) headers.set('range', range);

    const res = await fetchOrigin(env.ORIGIN + url.pathname + url.search, {
        method: request.method,
        headers,
        cf: {
            cacheEverything: true,
            cacheTtlByStatus: { '200-299': 31536000, 404: 60, '500-599': 0 },
        },
    });

    const out = new Headers(res.headers);

    out.set('access-control-allow-origin', '*');
    out.delete('set-cookie');

    return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: out,
    });
}

const worker = {
    fetch: (request: Request, env: Env) => handle(request, env),
};

export default worker;
