import type { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { errorResponse } from "@/lib/utils/api/api-response";
import { readLimitedBody } from "@/lib/utils/api/read-limited-body";

export async function parseBody<T>(
  schema: ZodType<T>,
  req: Request,
  message: string = API_ERRORS.INVALID_BODY,
  options: { maxBytes?: number } = {},
): Promise<T | NextResponse> {
  let raw: unknown;

  try {
    if (options.maxBytes === undefined) {
      raw = await req.json();
    } else {
      const body = await readLimitedBody(req, options.maxBytes);

      if (!body.ok) return errorResponse(API_ERRORS.BODY_TOO_LARGE, 413);

      raw = JSON.parse(body.text);
    }
  } catch {
    return errorResponse(API_ERRORS.INVALID_JSON, 400);
  }

  const parsed = schema.safeParse(raw);

  return parsed.success ? parsed.data : errorResponse(message, 400, parsed.error.issues);
}
