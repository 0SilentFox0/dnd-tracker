import { NextResponse } from "next/server";
import { createMcpHandler } from "mcp-handler";

import { registerMcpTools, toolsFor } from "@/lib/ai/tools";
import { AI_LIMITS } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { verifyBearer } from "@/lib/utils/api/actor";
import { errorResponse } from "@/lib/utils/api/api-response";
import { bearerToken } from "@/lib/utils/api/bearer";

export const maxDuration = 300;

// stateless: a handler per request, closed over the token's campaign
async function handler(req: Request): Promise<Response> {
  const auth = await verifyBearer(bearerToken(req), null);

  if (auth instanceof NextResponse) return auth;

  const tools = toolsFor(auth.scopes);

  if (tools.length === 0) return errorResponse(API_ERRORS.API_TOKEN_SCOPE_MISSING, 403);

  const mcp = createMcpHandler((server) => registerMcpTools(server, tools, { campaignId: auth.campaignId, userId: auth.userId, scopes: auth.scopes, threadId: null, abortSignal: AbortSignal.any([AbortSignal.timeout(AI_LIMITS.requestDeadlineMs), req.signal]) }), {
    serverInfo: { name: "dnd-tracker", version: "1.0.0" },
  });

  const res = await mcp(req);

  if (req.method !== "POST" || !res.body) return res;

  // SSE body is produced after return, so tool-side revalidateTag would miss the request's flush
  return new Response(await res.text(), { status: res.status, statusText: res.statusText, headers: res.headers });
}

export { handler as DELETE, handler as GET, handler as POST };
