import { PrismaClient } from '@prisma/client';

import { capacity, type CapacityEnv } from '@/lib/config/capacity';
import { contentLayer } from '@/lib/db/content-layer';
import { createScopedDatabase } from '@/lib/server/content/write-context';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export function withSafePoolLimits(
    databaseUrl?: string,
    env: CapacityEnv = process.env
) {
    if (!databaseUrl) {
        return databaseUrl;
    }

    try {
        const parsed = new URL(databaseUrl);

        const isDev = env.NODE_ENV === 'development' && !env.VERCEL;

        const isPooled =
            Boolean(env.VERCEL) ||
            parsed.hostname.includes('pooler.') ||
            parsed.searchParams.get('pgbouncer') === 'true';

        if (!isPooled && !isDev) {
            return databaseUrl;
        }

        const cap = capacity(env);

        const override = Number.parseInt(env.PRISMA_CONNECTION_LIMIT ?? '', 10);

        const limit =
            override > 0
                ? override
                : isDev
                  ? cap.dbConnectionLimitDev
                  : cap.dbConnectionLimit;

        if (!parsed.searchParams.has('connection_limit')) {
            parsed.searchParams.set('connection_limit', String(limit));
        }

        if (!parsed.searchParams.has('pool_timeout')) {
            parsed.searchParams.set(
                'pool_timeout',
                String(isDev ? cap.dbPoolTimeoutSecDev : cap.dbPoolTimeoutSec)
            );
        }

        return parsed.toString();
    } catch {
        return databaseUrl;
    }
}

const basePrisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log:
            process.env.NODE_ENV === 'development'
                ? ['query', 'error', 'warn']
                : ['error'],
        datasources: {
            db: {
                url: withSafePoolLimits(process.env.DATABASE_URL),
            },
        },
        // Transaction mode (port 6543) has no prepared statements
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

export const prisma = createScopedDatabase(
    basePrisma.$extends(contentLayer()) as unknown as PrismaClient
);
