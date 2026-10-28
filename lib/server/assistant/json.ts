import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";

import type { ActionResult } from "./types";

import "server-only";
import { stableStringify } from "@/lib/utils/battle/store/stable-json";

/** Preserve the established JSON roundtrip, including its unsupported-value
 * errors. This normalization is part of persisted full-snapshot fingerprints. */
export const jsonContent = (value: unknown): Prisma.JsonValue => JSON.parse(JSON.stringify(value ?? null));

export const requestDigest = (value: unknown): string => createHash("sha256").update(stableStringify(value)).digest("hex");

export const jsonContentInput = (value: unknown): Prisma.InputJsonValue => jsonContent(value) as Prisma.InputJsonValue;

export const actionResult = (domain: string, name: string) => (data: unknown, id: string): ActionResult => ({ data: jsonContent(data), affected: [{ domain, id, name }], warnings: [] });
