import { NextResponse } from "next/server";
import { APICallError, generateObject, RetryError } from "ai";

import { aiGuard } from "@/app/api/campaigns/[id]/ai/ai-handlers";
import { pickDmSmartTextModel } from "@/lib/ai/dm-model";
import { aiErrorMessage } from "@/lib/ai/errors";
import { guarded } from "@/lib/ai/guarded";
import { AI_BODY_LIMITS, AI_LIMITS, AI_RATE_LIMITS } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { languageName } from "@/lib/i18n/language-name";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { clampSummary, generateSummaryBodySchema, lenientSummarySchema, SUMMARY_LIMITS } from "@/lib/schemas/scenario-summary";
import { readContent } from "@/lib/server/scenario/page-store";
import { loadSummaryRow, upsertSummary } from "@/lib/server/scenario/summary-store";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { readLimitedBody } from "@/lib/utils/api/read-limited-body";
import { buildSummaryInput, filterSummaryEntities } from "@/lib/utils/scenario/summary/input";

const instruction = (language: string) =>
  [
    "You summarize one page of a D&D campaign scenario for the dungeon master.",
    `Write in ${language}.`,
    "overview and events are for the DM: what the page is about and the key beats in order.",
    "secrets are the hidden layer: facts that players must not learn (the ||double bars|| text and DM notes); overview, events and digest must not reveal them.",
    `Limits: overview at most ${SUMMARY_LIMITS.overview} characters; at most ${SUMMARY_LIMITS.events} events of at most ${SUMMARY_LIMITS.event} characters each; at most ${SUMMARY_LIMITS.secrets} secrets of at most ${SUMMARY_LIMITS.secret} characters each; digest at most ${SUMMARY_LIMITS.digest} characters.`,
    "entities may only contain keys from the allowed entities list; never invent keys.",
    "digest is one line usable as context for an assistant that knows the whole scenario.",
  ].join("\n");

async function readForce(req: Request): Promise<{ force?: boolean } | NextResponse> {
  const body = await readLimitedBody(req, AI_BODY_LIMITS.small);

  if (!body.ok) return errorResponse(API_ERRORS.BODY_TOO_LARGE, 413);

  let raw: unknown = {};

  if (body.text.trim()) {
    try {
      raw = JSON.parse(body.text);
    } catch {
      return errorResponse(API_ERRORS.INVALID_JSON, 400);
    }
  }

  const parsed = generateSummaryBodySchema.safeParse(raw);

  return parsed.success ? parsed.data : errorResponse(API_ERRORS.INVALID_BODY, 400, parsed.error.issues);
}

export const generateSummaryHandler = (req: Request, campaignId: string, pageId: string) =>
  guarded("generate scenario summary", () => aiGuard(campaignId), async (access) => {
    const body = await readForce(req);

    if (body instanceof NextResponse) return body;

    const page = await loadOwned(
      prisma.scenarioPage.findUnique({ where: { id: pageId }, select: { id: true, campaignId: true, version: true, title: true, kind: true, arc: true, content: true } }),
      campaignId,
      API_ERRORS.SCENARIO_NOT_FOUND,
    );

    if (page instanceof NextResponse) return page;

    const row = await loadSummaryRow(pageId);

    if (row && row.version === page.version && !body.force) {
      return NextResponse.json({ summary: row.summary, version: row.version, stale: false, truncated: false });
    }

    const limit = await checkRateLimit({ userId: access.userId, scope: "scenario-summary", battleId: campaignId, ...AI_RATE_LIMITS.summary, memoryFallback: true });

    if (!limit.allowed) return rateLimitResponse(limit);

    const input = buildSummaryInput({ title: page.title, kind: page.kind, arc: page.arc, content: readContent(page.content) }, AI_LIMITS.summaryInputChars);

    if (input.empty) return errorResponse(API_ERRORS.AI_SUMMARY_EMPTY, 400);

    const choice = await pickDmSmartTextModel(campaignId);

    if (!choice) return errorResponse(API_ERRORS.AI_KEY_MISSING, 400);

    const locale = await getRequestLocale();

    let result;

    try {
      result = await generateObject({ model: choice.model, schema: lenientSummarySchema, prompt: `${instruction(languageName(locale))}\n\n${input.prompt}`, abortSignal: req.signal });
    } catch (error) {
      const cause = RetryError.isInstance(error) ? error.lastError : error;

      console.error("[ai summary]", APICallError.isInstance(cause) ? cause.statusCode : error instanceof Error ? error.name : "unknown");

      return errorResponse(aiErrorMessage(error), 502);
    }

    const summary = filterSummaryEntities(clampSummary(result.object), input.allowedKeys);

    await upsertSummary({
      pageId,
      campaignId,
      version: page.version,
      summary,
      provider: choice.provider,
      model: choice.modelId,
      inputTokens: result.usage.inputTokens ?? null,
      outputTokens: result.usage.outputTokens ?? null,
    });

    return NextResponse.json({ summary, version: page.version, stale: false, truncated: input.truncated });
  });
