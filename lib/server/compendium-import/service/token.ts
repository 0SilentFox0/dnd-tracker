import { createHmac, timingSafeEqual } from 'node:crypto';

import type { Actor } from '@/lib/utils/api/actor';
import { isRecord } from '@/lib/utils/common/is-record';
import {
    CompendiumError,
    type JsonRecord,
} from '@/lib/utils/compendium-import/parse';

export const requireActor = (actor: Actor) => {
    if (!actor.isDM || actor.via !== 'session')
        throw new CompendiumError('FORBIDDEN');
};

export function signingKey(secret: string) {
    if (typeof secret !== 'string' || secret.length < 32)
        throw new CompendiumError('PREVIEW_SECRET_REQUIRED');

    return secret;
}

const signature = (body: string, secret: string) =>
    createHmac('sha256', signingKey(secret)).update(body).digest('base64url');

export function tokenFor(
    actor: Actor,
    fingerprint: string,
    planHash: string,
    secret: string
) {
    const data = Buffer.from(
        JSON.stringify({
            user: actor.userId,
            campaign: actor.campaignId,
            fingerprint,
            planHash,
            expires: Date.now() + 15 * 60_000,
        })
    ).toString('base64url');

    return `${data}.${signature(data, secret)}`;
}

export function tokenData(
    actor: Actor,
    token: string,
    fingerprint: string,
    secret: string
): JsonRecord {
    const [body, supplied, extra] = token.split('.');

    if (!body || !supplied || extra || token.length > 4096)
        throw new CompendiumError('PREVIEW_INVALID');

    const expected = Buffer.from(signature(body, secret));

    const got = Buffer.from(supplied);

    if (got.length !== expected.length || !timingSafeEqual(got, expected))
        throw new CompendiumError('PREVIEW_INVALID');

    let data: unknown;

    try {
        data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
        throw new CompendiumError('PREVIEW_INVALID');
    }

    if (
        !isRecord(data) ||
        data.user !== actor.userId ||
        data.campaign !== actor.campaignId ||
        data.fingerprint !== fingerprint ||
        typeof data.expires !== 'number' ||
        data.expires < Date.now()
    )
        throw new CompendiumError('PREVIEW_STALE');

    return data;
}
