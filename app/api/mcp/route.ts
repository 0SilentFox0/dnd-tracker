import { NextResponse } from "next/server";
import { createMcpHandler } from "mcp-handler";

import { buildToolContext } from "@/lib/ai/mcp-context";
import { boundMcpRequest } from "@/lib/ai/mcp-request";
import { registerMcpTools, toolsFor } from "@/lib/ai/tools";
import { AI_RATE_LIMITS } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { verifyBearer } from "@/lib/utils/api/actor";
import { errorResponse } from "@/lib/utils/api/api-response";
import { bearerToken } from "@/lib/utils/api/bearer";
import { checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";

export const maxDuration = 300;

// stateless: a handler per request, closed over the token's campaign
async function handler(req: Request): Promise<Response> {
  const auth = await verifyBearer(bearerToken(req), null);

  if (auth instanceof NextResponse) return auth;

  const tools = toolsFor(auth.scopes);

  if (tools.length === 0) return errorResponse(API_ERRORS.API_TOKEN_SCOPE_MISSING, 403);

  if (req.method === "POST") {
    const rate = await checkRateLimit({ userId: auth.tokenId, scope: "mcp", ...AI_RATE_LIMITS.mcp, memoryFallback: true });

    if (!rate.allowed) return rateLimitResponse(rate);
  }

  const bounded = await boundMcpRequest(req);

  if (bounded instanceof Response) return bounded;

  const mcp = createMcpHandler((server) => registerMcpTools(server, tools, buildToolContext(auth, req)), {
    serverInfo: { name: "dnd-tracker", version: "1.0.0" },
  });

  const res = await mcp(bounded);

  if (req.method !== "POST" || !res.body) return res;

  // SSE body is produced after return, so tool-side revalidateTag would miss the request's flush
  return new Response(await res.text(), { status: res.status, statusText: res.statusText, headers: res.headers });
}

export { handler as DELETE, handler as GET, handler as POST };
