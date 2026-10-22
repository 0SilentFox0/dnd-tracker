import type { NextResponse } from "next/server";
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { errorResponse } from "@/lib/utils/api/api-response";
import { SyncArtifactSetError } from "@/lib/server/artifacts/sync-artifact-set-members";

/** Відповідь 400 для відомих помилок валідації / синхронізації сету. */
export function toArtifactSetErrorResponse(
  error: unknown,
): NextResponse | null {
  if (error instanceof z.ZodError) {
    return errorResponse(API_ERRORS.INVALID_BODY, 400, error.issues);
  }

  if (error instanceof SyncArtifactSetError) {
    return errorResponse(error.message, 400);
  }

  return null;
}
