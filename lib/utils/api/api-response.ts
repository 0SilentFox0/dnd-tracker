import { NextResponse } from "next/server";

export type ApiErrorBody = { error: string; issues?: unknown };

export function errorResponse(message: string, status: number, issues?: unknown): NextResponse {
  const body: ApiErrorBody = issues === undefined ? { error: message } : { error: message, issues };

  return NextResponse.json(body, { status });
}
