import { NextResponse } from "next/server";

import { isChannelAllowedForUser } from "./channel-access";
import { readAuthParams } from "./read-auth-params";

import { getSessionUserId } from "@/lib/auth";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { pusherServer } from "@/lib/pusher/server";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";

/** Subscription is allowed only to the user's own channel or to a battle channel of a campaign they belong to. */
export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();

    if (!userId) return errorResponse(API_ERRORS.UNAUTHORIZED, 401);

    const params = await readAuthParams(request);

    if (!params) return errorResponse(API_ERRORS.INVALID_JSON, 400);

    const { socket_id, channel_name } = params;

    if (typeof socket_id !== "string" || typeof channel_name !== "string") {
      return errorResponse(API_ERRORS.MISSING_PUSHER_PARAMS, 400);
    }

    if (!(await isChannelAllowedForUser(channel_name, userId))) return errorResponse(API_ERRORS.FORBIDDEN, 403);

    const authResponse = pusherServer.authorizeChannel(socket_id, channel_name, {
      user_id: userId,
      user_info: {},
    });

    return NextResponse.json(authResponse);
  } catch (error) {
    return handleApiError(error, { action: "authenticate pusher" });
  }
}
