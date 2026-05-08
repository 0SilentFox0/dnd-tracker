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
  logApiError(error, context);

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

function logApiError(error: unknown, context: ApiErrorContext): void {
  const errorInfo = serializeError(error);

  console.error(`[api] ${context.action} failed`, {
    ...context,
    error: errorInfo,
  });
}

function serializeError(
  error: unknown,
): Record<string, unknown> | string {
  if (error instanceof z.ZodError) {
    return { kind: "ZodError", issues: error.issues };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      kind: "PrismaClientKnownRequestError",
      code: error.code,
      message: error.message,
      meta: error.meta,
    };
  }

  if (error instanceof Error) {
    return {
      kind: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return String(error);
}
