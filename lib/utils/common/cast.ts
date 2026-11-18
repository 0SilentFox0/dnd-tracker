/** Narrows a loosely typed runtime object (Prisma delegates, dynamic model lookups) to a local structural type; never use on user input. */
export const unsafeCast = <T>(v: unknown): T => v as T;
