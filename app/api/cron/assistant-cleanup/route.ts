import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { cleanupAssistantData } from "@/lib/server/assistant/cleanup";
import { cleanupReadNotifications } from "@/lib/server/notifications/cleanup";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) return errorResponse(API_ERRORS.CRON_NOT_CONFIGURED, 503);

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return errorResponse(API_ERRORS.UNAUTHORIZED, 401);
  }

  try {
    const result = await cleanupAssistantData();

    const notifications = await cleanupReadNotifications();

    return NextResponse.json({ ok: true, ...result, ...notifications });
  } catch (error) {
    return handleApiError(error, { action: "assistant cleanup" });
  }
}
