/**
 * Спільний обробник помилок для API routes.
 *
 * Замінює ~94 однотипні catch-блоки у `app/api/**` (CODE_AUDIT 2.1, 3.3):
 *  - structured лог з контекстом замість `console.error("Error X:", error)`,
 *  - ZodError → 400 з `error.issues`,
 *  - Prisma P2025 (not found) → 404,
 *  - Prisma P2003 (FK violation) → 400 (generic; domain-specific повідомлення
 *    залишаються у route — можна перевіряти Prisma error раніше і повертати
 *    кастомну відповідь, перш ніж делегувати сюди),
 *  - інше → 500 з generic повідомленням (без витоку деталей у відповідь).
 *
 * Усі error details (stack, message, prisma code) логуються; назовні
 * відправляється лише generic статус, щоб не витікали внутрішні деталі.
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
