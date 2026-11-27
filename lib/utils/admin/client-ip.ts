import { isIP } from 'node:net';

import 'server-only';

type HeaderReader = { get(name: string): string | null };

const MAX_IP_LENGTH = 45;

function validIp(value: string | null | undefined): string | null {
    const v = value?.trim();

    if (!v || v.length > MAX_IP_LENGTH || isIP(v) === 0) return null;

    return v;
}

export function parseClientIp(h: HeaderReader): string | null {
    const forwarded = h.get('x-forwarded-for')?.split(',')[0];

    return validIp(forwarded) ?? validIp(h.get('x-real-ip'));
}

export function parseCountry(h: HeaderReader): string | null {
    const v = h.get('x-vercel-ip-country');

    return v && /^[A-Z]{2}$/.test(v) ? v : null;
}
