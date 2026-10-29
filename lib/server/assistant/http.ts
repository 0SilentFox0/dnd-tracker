import { NextResponse } from "next/server";

import { chatCaller } from "./caller";
import { confirmIntent, rejectIntent } from "./execute";
import { getIntent, listIntents } from "./intent-store";
import { readDeletionReceipt, readReceipt } from "./receipts";

import "server-only";
import { AI_BODY_LIMITS } from "@/lib/constants/ai";
import { API_ERRORS, type ErrorParams } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { assistantPolicySchema } from "@/lib/schemas/assistant";
import { ContentError } from "@/lib/server/content/errors";
import { requireAuth, requireDM } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { parseBody } from "@/lib/utils/api/parse-body";
import { checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { isSameOriginRequest } from "@/lib/utils/api/same-origin";
import { apiErrorJson } from "@/lib/utils/api/translate-error";

type RouteMode = "list" | "detail" | "receipt" | "confirm" | "reject" | "policy";
type Context = { params: Promise<{ id: string; intentId?: string }> };

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_NO_STORE_HEADERS });

const errorJson = (body: { error: string; code?: string; params?: ErrorParams }, status: number) => apiErrorJson(body, { status, headers: PRIVATE_NO_STORE_HEADERS });

const privateResponse = (response: Response) => { response.headers.set("cache-control", "private, no-store");

 return response; };

export function assistantRoute(mode: RouteMode) {
  return async (req: Request, context: Context): Promise<Response> => {
    try {
      const { id: campaignId, intentId } = await context.params;

      if (!campaignId || campaignId.length > 100 || (intentId && intentId.length > 100)) return json({ code: "INVALID_INPUT" }, 400);

      const mutation = mode === "confirm" || mode === "reject" || mode === "policy";

      // No cookie fallback or Bearer confirmation: this is the human UI boundary.
      if (req.headers.has("authorization")) return json({ code: "SESSION_REQUIRED" }, 403);

      if (mutation && !isSameOriginRequest(req)) return json({ code: "FORBIDDEN" }, 403);

      let receiptRateChecked = false;

      if (mode === "receipt" && intentId) {
        const auth = await requireAuth();

        if (auth instanceof NextResponse) return privateResponse(auth);

        const rate = await checkRateLimit({ userId: auth.userId, scope: "assistant-receipt", battleId: campaignId, limit: 120, windowSeconds: 60, memoryFallback: true });

        if (!rate.allowed) return privateResponse(rateLimitResponse(rate));

        receiptRateChecked = true;
        try { return json(await readDeletionReceipt(auth.userId, campaignId, intentId)); }
        catch (error) { if (!(error instanceof ContentError) || error.status !== 404) throw error; }
      }

      const access = await requireDM(campaignId);

      if (access instanceof NextResponse) return privateResponse(access);

      const caller = chatCaller(campaignId, access.userId, null, await getRequestLocale());

      if (!receiptRateChecked) {
        const rate = await checkRateLimit({ userId: access.userId, scope: `assistant-${mode}`, battleId: campaignId, limit: mutation ? 20 : 120, windowSeconds: 60, memoryFallback: true });

        if (!rate.allowed) return privateResponse(rateLimitResponse(rate));
      }

      if (mode === "list") {
        const url = new URL(req.url);

        const cursor = url.searchParams.get("cursor") ?? undefined;

        const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined;

        return json(await listIntents(caller, { cursor, limit, ...(url.searchParams.has("status") && { status: url.searchParams.get("status") as never }) }));
      }

      if (mode === "policy") {
        const body = await parseBody(assistantPolicySchema, req, undefined, { maxBytes: AI_BODY_LIMITS.small });

        if (body instanceof NextResponse) return privateResponse(body);

        const where = { id: body.id, campaignId, userId: access.userId };

        const result = body.target === "thread"
          ? await prisma.aiThread.updateMany({ where, data: { executionMode: body.executionMode } })
          : await prisma.apiToken.updateMany({ where: { ...where, revokedAt: null }, data: { executionMode: body.executionMode } });

        if (result.count !== 1) return json({ code: "NOT_FOUND" }, 404);

        return json({ id: body.id, executionMode: body.executionMode });
      }

      if (!intentId) return json({ code: "INVALID_INPUT" }, 400);

      if (mode === "detail") return json(await getIntent(caller, intentId));

      if (mode === "receipt") return json(await readReceipt(caller, intentId));

      if (mode === "confirm") return json(await confirmIntent(caller.actor, intentId, caller.locale));

      return json(await rejectIntent(caller, intentId));
    } catch (error) {
      if (error instanceof ContentError) return errorJson({ code: error.status === 409 ? "ASSISTANT_CONFLICT" : "ASSISTANT_UNAVAILABLE", error: error.message, params: error.params }, error.status);

      // Do not log unknown DB/provider exceptions or return their raw payload.
      return errorJson({ code: "ASSISTANT_FAILED", error: API_ERRORS.ASSISTANT_RUN_FAILED }, 500);
    }
  };
}
