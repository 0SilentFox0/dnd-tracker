import "server-only";
import type { AiToolContext } from "@/lib/ai/tools/define";
import { AI_LIMITS } from "@/lib/constants/ai";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { negotiateLocale } from "@/lib/i18n/resolve-locale";
import type { verifyBearer } from "@/lib/utils/api/actor";

type McpAuth = Exclude<Awaited<ReturnType<typeof verifyBearer>>, Response>;

const cookieValue = (header: string | null, name: string) => header?.split(";").map((part) => part.trim().split("=")).find(([key]) => key === name)?.[1] ?? null;

export function buildToolContext(auth: McpAuth, req: Request): AiToolContext {
  const locale = negotiateLocale({ cookie: cookieValue(req.headers.get("cookie"), LOCALE_COOKIE), acceptLanguage: req.headers.get("accept-language") }) ?? auth.locale;

  const { campaignId, userId, scopes } = auth;

  return {
    campaignId, userId, scopes, threadId: null, locale,
    caller: { actor: { campaignId, userId, isDM: true, via: "token", scopes }, channel: "mcp", threadId: null, tokenId: auth.tokenId, locale },
    abortSignal: AbortSignal.any([AbortSignal.timeout(AI_LIMITS.requestDeadlineMs), req.signal]),
  };
}
