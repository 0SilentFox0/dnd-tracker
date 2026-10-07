/**
 * Спільний обробник помилок API routes: ZodError → 400 з `issues`, Prisma P2025 → 404, P2003 → 400,
 * інше → 500 з generic повідомленням. Деталі (stack, message, prisma code) лише в лозі, не у відповіді.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { logger } from "@/lib/utils/logger";

/**
 * Контекст логу. `action` обов'язковий — описує що робила route
 * (наприклад "create character", "patch participant HP").
 * Інші ключі — будь-які корисні id-ки (campaignId, battleId, userId, тощо).
 */
export interface ApiErrorContext {
  action: string;
  [key: string]: unknown;
}

export function handleApiError(
  error: unknown,
  context: ApiErrorContext,
): NextResponse {
  logger.error(`[api] ${context.action} failed`, context, error);

  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: error.issues }, { status: 400 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Foreign key constraint failed" },
        { status: 400 },
      );
    }
  }

  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  );
}
