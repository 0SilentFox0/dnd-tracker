import type { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { errorResponse } from "@/lib/utils/api/api-response";

export async function parseBody<T>(
  schema: ZodType<T>,
  req: Request,
  message: string = API_ERRORS.INVALID_BODY,
): Promise<T | NextResponse> {
  let raw: unknown;

  try {
    raw = await req.json();
  } catch {
    return errorResponse(API_ERRORS.INVALID_JSON, 400);
  }

  const parsed = schema.safeParse(raw);

  return parsed.success ? parsed.data : errorResponse(message, 400, parsed.error.issues);
}
