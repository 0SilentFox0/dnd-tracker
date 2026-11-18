import { NextResponse } from 'next/server';

import { readLimitedBody } from '@/lib/utils/api/read-limited-body';

const MAX_BODY_BYTES = 8 * 1024;

const FIELDS = [
    'effective-directive',
    'effectiveDirective',
    'violated-directive',
    'blocked-uri',
    'blockedURL',
    'disposition',
] as const;

const clip = (value: unknown) =>
    typeof value === 'string' ? value.slice(0, 200) : undefined;

// query strings and fragments can carry tokens: keep origin + path only
function stripUrl(value: unknown): string | undefined {
    const raw = clip(value);

    if (!raw) return undefined;

    try {
        const u = new URL(raw);

        return `${u.origin}${u.pathname}`;
    } catch {
        return raw.split(/[?#]/)[0];
    }
}

function summarize(entry: unknown): string | null {
    if (!entry || typeof entry !== 'object') return null;

    const root = entry as Record<string, unknown>;

    const body = (root['csp-report'] ?? root.body ?? root) as Record<
        string,
        unknown
    >;

    const parts = FIELDS.flatMap((f) => {
        const v =
            f.toLowerCase().includes('uri') || f.endsWith('URL')
                ? stripUrl(body[f])
                : clip(body[f]);

        return v ? [`${f}=${v}`] : [];
    });

    const doc = stripUrl(body['document-uri'] ?? body.documentURL);

    if (doc) parts.push(`doc=${doc}`);

    return parts.length ? parts.join(' ') : null;
}

export async function POST(req: Request) {
    const body = await readLimitedBody(req, MAX_BODY_BYTES);

    if (!body.ok) return new NextResponse(null, { status: 413 });

    try {
        const json: unknown = JSON.parse(body.text);

        const entries = Array.isArray(json) ? json.slice(0, 10) : [json];

        for (const entry of entries) {
            const line = summarize(entry);

            if (line) console.warn(`[csp-report] ${line}`);
        }
    } catch {
        return new NextResponse(null, { status: 400 });
    }

    return new NextResponse(null, { status: 204 });
}
