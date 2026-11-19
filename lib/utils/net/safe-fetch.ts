import dns from 'node:dns';
import { isIP } from 'node:net';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { isPrivateIp } from '@/lib/utils/api/safe-fetch';
import type { Result } from '@/types/common';

type Lookup = typeof dns.lookup;

export const isForbiddenAddress = isPrivateIp;

const invalid = (): Result<never> => ({
    ok: false,
    message: API_ERRORS.SOUND_LINK_INVALID,
});

async function resolvesSafely(host: string, lookup: Lookup): Promise<boolean> {
    const bare = host.replace(/^\[|\]$/g, '').toLowerCase();

    if (bare === 'localhost' || bare.endsWith('.localhost')) return false;

    if (isIP(bare)) return !isForbiddenAddress(bare);

    const addresses = await new Promise<{ address: string }[]>(
        (resolve, reject) =>
            lookup(bare, { all: true }, (err, result) =>
                err ? reject(err) : resolve(result as { address: string }[])
            )
    ).catch(() => []);

    return (
        addresses.length > 0 &&
        addresses.every((a) => !isForbiddenAddress(a.address))
    );
}

async function readCapped(
    response: Response,
    maxBytes: number
): Promise<Uint8Array | null> {
    if (Number(response.headers.get('content-length') ?? 0) > maxBytes)
        return null;

    const reader = response.body?.getReader();

    if (!reader) return null;

    const chunks: Uint8Array[] = [];

    let total = 0;

    for (;;) {
        const { done, value } = await reader.read();

        if (done) break;

        total += value.byteLength;

        if (total > maxBytes) {
            await reader.cancel().catch(() => undefined);

            return null;
        }

        chunks.push(value);
    }

    const bytes = new Uint8Array(total);

    let offset = 0;

    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }

    return bytes;
}

export async function safeFetchBytes(
    url: string,
    opts: {
        maxBytes: number;
        timeoutMs: number;
        maxRedirects: number;
        lookup?: Lookup;
    }
): Promise<Result<{ bytes: Uint8Array; contentType: string }>> {
    const lookup = opts.lookup ?? dns.lookup;

    const signal = AbortSignal.timeout(opts.timeoutMs);

    try {
        let current = url;

        for (let hop = 0; hop <= opts.maxRedirects; hop++) {
            const parsed = new URL(current);

            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
                return invalid();

            if (!(await resolvesSafely(parsed.hostname, lookup)))
                return invalid();

            const response = await fetch(parsed, { redirect: 'manual', signal });

            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get('location');

                await response.body?.cancel().catch(() => undefined);

                if (!location) return invalid();

                current = new URL(location, parsed).toString();

                continue;
            }

            if (!response.ok) return invalid();

            const bytes = await readCapped(response, opts.maxBytes);

            if (!bytes)
                return {
                    ok: false,
                    message: API_ERRORS.SOUND_LINK_TOO_LARGE,
                };

            return {
                ok: true,
                value: {
                    bytes,
                    contentType: response.headers.get('content-type') ?? '',
                },
            };
        }

        return invalid();
    } catch {
        return invalid();
    }
}
