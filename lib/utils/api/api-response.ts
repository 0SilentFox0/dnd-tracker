import { NextResponse } from "next/server";

import { PRIVATE_NO_STORE_HEADERS } from "./cache-headers";
import { apiErrorJson } from "./translate-error";

import type { ErrorParams } from "@/lib/constants/api-errors";

export type ApiErrorBody = { error: string; errorKey?: string; issues?: unknown };

export function errorResponse(keyOrText: string, status: number, issues?: unknown, params?: ErrorParams): NextResponse {
  return apiErrorJson({ error: keyOrText, issues, params }, { status });
}

export const attachmentHeaders = (fileName: string, contentType?: string): Record<string, string> => ({
  ...(contentType && { "Content-Type": contentType }),
  "Content-Disposition": `attachment; filename="${fileName}"`,
  ...PRIVATE_NO_STORE_HEADERS,
});

export const privateJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_NO_STORE_HEADERS });
