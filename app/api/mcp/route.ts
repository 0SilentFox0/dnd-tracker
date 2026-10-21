import { createMcpHandler } from "mcp-handler";

import { verifyApiToken } from "@/lib/ai/api-tokens";
import { registerMcpTools } from "@/lib/ai/tools";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { errorResponse } from "@/lib/utils/api/api-response";

export const maxDuration = 60;

// stateless: a handler per request, closed over the token's campaign
async function handler(req: Request): Promise<Response> {
  const raw = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

  const auth = raw ? await verifyApiToken(raw) : null;

  if (!auth) return errorResponse(API_ERRORS.UNAUTHORIZED, 401);

  const mcp = createMcpHandler((server) => registerMcpTools(server, { campaignId: auth.campaignId, userId: auth.userId, threadId: null }), {
    serverInfo: { name: "dnd-tracker", version: "1.0.0" },
  });

  return mcp(req);
}

export { handler as DELETE, handler as GET, handler as POST };
