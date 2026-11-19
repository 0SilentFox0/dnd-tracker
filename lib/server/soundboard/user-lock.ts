import type { Prisma } from '@prisma/client';

import 'server-only';

// pg_advisory_xact_lock returns void, which $queryRaw cannot deserialize, hence $executeRaw
export const lockUserSounds = (tx: Prisma.TransactionClient, userId: string) =>
    tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`sound-presets:${userId}`}))`;
