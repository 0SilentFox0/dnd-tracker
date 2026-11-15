import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { privateJson } from '@/lib/utils/api/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (new URL(request.url).searchParams.get('deep') !== '1')
        return privateJson({ status: 'ok' });

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
