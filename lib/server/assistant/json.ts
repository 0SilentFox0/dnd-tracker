import type { Prisma } from "@prisma/client";

import "server-only";

/** Preserve the established JSON roundtrip, including its unsupported-value
 * errors. This normalization is part of persisted full-snapshot fingerprints. */
export const jsonContent = (value: unknown): Prisma.JsonValue => JSON.parse(JSON.stringify(value ?? null));
