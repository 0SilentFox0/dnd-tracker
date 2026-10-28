import type { NextResponse } from "next/server";

import type { ErrorParams } from "@/lib/constants/api-errors";

import { PRIVATE_NO_STORE_HEADERS } from "./cache-headers";
import { apiErrorJson } from "./translate-error";

export type ApiErrorBody = { error: string; errorKey?: string; issues?: unknown };

export function errorResponse(keyOrText: string, status: number, issues?: unknown, params?: ErrorParams): NextResponse {
  return apiErrorJson({ error: keyOrText, issues, params }, { status });
}

export const attachmentHeaders = (fileName: string, contentType?: string): Record<string, string> => ({
  ...(contentType && { "Content-Type": contentType }),
  "Content-Disposition": `attachment; filename="${fileName}"`,
  ...PRIVATE_NO_STORE_HEADERS,
});
