import { Prisma } from '@prisma/client';
import { timingSafeEqual } from 'node:crypto';

import { prisma } from '@/lib/db';
import { privateJson } from '@/lib/utils/api/api-response';
import { bearerToken } from '@/lib/utils/api/bearer';

export const dynamic = 'force-dynamic';

function hasHealthSecret(request: Request): boolean {
    const secret = process.env.HEALTH_SECRET;

    const given =
        request.headers.get('x-health-secret') ?? bearerToken(request);

    if (!secret || !given) return false;

    const a = Buffer.from(secret);

    const b = Buffer.from(given);

    return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
    if (new URL(request.url).searchParams.get('deep') !== '1')
        return privateJson({ status: 'ok' });

    if (!hasHealthSecret(request))
        return privateJson({ status: 'forbidden' }, 401);

    try {
        const [result] = await Promise.allSettled([
            prisma.$queryRaw(Prisma.sql`SELECT 1`),
        ]);

        return result.status === 'fulfilled'
            ? privateJson({ status: 'ok' })
            : privateJson({ status: 'error' }, 503);
    } catch {
        return privateJson({ status: 'error' }, 503);
    }
}
