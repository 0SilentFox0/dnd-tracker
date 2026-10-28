import { NextResponse } from "next/server";
import { createMcpHandler } from "mcp-handler";

import { registerMcpTools } from "@/lib/ai/tools";
import { AI_LIMITS } from "@/lib/constants/ai";
import { authenticateToken } from "@/lib/utils/api/actor";
import { bearerToken } from "@/lib/utils/api/bearer";

export const maxDuration = 300;

// stateless: a handler per request, closed over the token's campaign
async function handler(req: Request): Promise<Response> {
  const auth = await authenticateToken(bearerToken(req), null, "ai");

  if (auth instanceof NextResponse) return auth;

  const mcp = createMcpHandler((server) => registerMcpTools(server, { campaignId: auth.campaignId, userId: auth.userId, threadId: null, abortSignal: AbortSignal.any([AbortSignal.timeout(AI_LIMITS.requestDeadlineMs), req.signal]) }), {
    serverInfo: { name: "dnd-tracker", version: "1.0.0" },
  });

  return mcp(req);
}

export { handler as DELETE, handler as GET, handler as POST };
