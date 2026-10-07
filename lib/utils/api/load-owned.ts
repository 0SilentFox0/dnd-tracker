import type { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { errorResponse } from "@/lib/utils/api/api-response";

export async function loadOwned<T extends { campaignId: string }>(
  query: PromiseLike<T | null>,
  campaignId: string,
  notFoundMessage: string = API_ERRORS.NOT_FOUND,
): Promise<T | NextResponse> {
  const item = await query;

  if (!item) return errorResponse(notFoundMessage, 404);

  if (item.campaignId !== campaignId) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  return item;
}
