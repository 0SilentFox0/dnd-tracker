import type { Prisma } from "@prisma/client";

import { isRecord } from "./is-record";

export const toInputJson = (v: unknown) => v as Prisma.InputJsonValue;

export const asRecord = (v: unknown): Record<string, unknown> => (isRecord(v) ? v : {});

/** Preserve the established JSON roundtrip, including its unsupported-value
 * errors. This normalization is part of persisted full-snapshot fingerprints. */
export const jsonContent = (value: unknown): Prisma.JsonValue => JSON.parse(JSON.stringify(value ?? null));

export const jsonContentInput = (value: unknown): Prisma.InputJsonValue => jsonContent(value) as Prisma.InputJsonValue;
