import type { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { BundleInvalidError } from "@/lib/server/templates/bundle";
import { errorResponse } from "@/lib/utils/api/api-response";

export function bundleErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof BundleInvalidError)) return null;

  return errorResponse(error.message || API_ERRORS.BUNDLE_INVALID, 400, error.issues);
}
