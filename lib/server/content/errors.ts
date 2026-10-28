import type { Prisma } from "@prisma/client";
import type { ZodType } from "zod";

import { API_ERRORS, type ErrorParams } from "@/lib/constants/api-errors";

export class ContentError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues?: unknown,
    readonly params?: ErrorParams,
  ) {
    super(message);
    this.name = "ContentError";
  }
}

export function parseInput<T>(schema: ZodType<T>, raw: unknown, message: string = API_ERRORS.INVALID_BODY): T {
  const parsed = schema.safeParse(raw);

  if (!parsed.success) throw new ContentError(message, 400, parsed.error.issues);

  return parsed.data;
}

export const toJsonInput = (v: unknown) => (v === undefined ? undefined : (v as Prisma.InputJsonValue));
