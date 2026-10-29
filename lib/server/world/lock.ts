import type { Prisma } from "@prisma/client";

import "server-only";

export const lockWorldMap = (tx: Prisma.TransactionClient, mapId: string) => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`world-map:${mapId}`}))`;
