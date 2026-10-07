import type { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { errorResponse } from "@/lib/utils/api/api-response";
import { logger } from "@/lib/utils/logger";

export interface ApiErrorContext {
  action: string;
  [key: string]: unknown;
}

/** Details go to the log only; the response carries a generic message. */
export function handleApiError(error: unknown, context: ApiErrorContext): NextResponse {
  logger.error(`[api] ${context.action} failed`, context, error);

  if (error instanceof z.ZodError) {
    return errorResponse(API_ERRORS.INVALID_BODY, 400, error.issues);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return errorResponse(API_ERRORS.NOT_FOUND, 404);

    if (error.code === "P2003") return errorResponse(API_ERRORS.FOREIGN_KEY, 400);
  }

  return errorResponse(API_ERRORS.INTERNAL, 500);
}
