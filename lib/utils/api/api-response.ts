import { NextResponse } from "next/server";

import { PRIVATE_NO_STORE_HEADERS } from "./cache-headers";

export type ApiErrorBody = { error: string; issues?: unknown };

export function errorResponse(message: string, status: number, issues?: unknown): NextResponse {
  const body: ApiErrorBody = issues === undefined ? { error: message } : { error: message, issues };

  return NextResponse.json(body, { status });
}

export const attachmentHeaders = (fileName: string, contentType?: string): Record<string, string> => ({
  ...(contentType && { "Content-Type": contentType }),
  "Content-Disposition": `attachment; filename="${fileName}"`,
  ...PRIVATE_NO_STORE_HEADERS,
});
