import type { Prisma } from "@prisma/client";

import { isRecord } from "./is-record";

export const toInputJson = (v: unknown) => v as Prisma.InputJsonValue;

export const asRecord = (v: unknown): Record<string, unknown> => (isRecord(v) ? v : {});
