import type { Prisma } from '@prisma/client';

export interface RawDb {
    $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>;
    $transaction<T>(
        fn: (tx: RawDb) => Promise<T>,
        options?: { timeout?: number; maxWait?: number }
    ): Promise<T>;
}
