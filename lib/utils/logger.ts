/**
 * Структурований логер з контекстом (CODE_AUDIT 3.3).
 *
 * Замість `console.error("Error creating campaign:", error)` (без
 * контексту, ~30 місць) — `logger.error("create campaign failed",
 * { campaignId, userId }, error)`.
 *
 * Контракт:
 *  - первий аргумент — короткий event-style message (не "Error: ...").
 *  - другий — bag довільних key/value (id-ки, params, durations).
 *  - третій (для warn/error) — error object; серіалізується безпечно
 *    (ZodError → issues; Prisma → code/meta; Error → name/message/stack).
 *
 * Виводиться через console.{info,warn,error} — у dev це stdout/stderr,
 * у Vercel runtime потрапляє в Functions logs з метаданими реквесту.
 */

import { Prisma } from "@prisma/client";
import { z } from "zod";

export interface LogContext {
  [key: string]: unknown;
}

/**
 * Серіалізує будь-який thrown value у JSON-friendly запис.
 * Повертає або `Record<string, unknown>` (для відомих кідних класів),
 * або просту string (для не-Error значень).
 */
export function serializeError(
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

function buildPayload(context: LogContext, error?: unknown): LogContext {
  if (error === undefined) return context;

  return { ...context, error: serializeError(error) };
}

export const logger = {
  info(message: string, context: LogContext = {}): void {
    console.info(message, context);
  },

  warn(message: string, context: LogContext = {}, error?: unknown): void {
    console.warn(message, buildPayload(context, error));
  },

  error(message: string, context: LogContext = {}, error?: unknown): void {
    console.error(message, buildPayload(context, error));
  },
};
