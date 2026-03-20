import { NextResponse } from "next/server";
import { z } from "zod";

import { SyncArtifactSetError } from "@/lib/utils/artifacts/sync-artifact-set-members";

/** Відповідь 400 для відомих помилок валідації / синхронізації сету. */
export function toArtifactSetErrorResponse(
  error: unknown,
): NextResponse | null {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: error.issues }, { status: 400 });
  }

  if (error instanceof SyncArtifactSetError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return null;
}
