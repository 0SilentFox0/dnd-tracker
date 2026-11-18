import type { Prisma } from '@prisma/client';

import 'server-only';

// pg_advisory_xact_lock returns void, which $queryRaw cannot deserialize, hence $executeRaw
export const lockCampaignArtifacts = (
    tx: Prisma.TransactionClient,
    campaignId: string
) =>
    tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`artifacts:${campaignId}`}))`;
