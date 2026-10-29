import { NextResponse } from "next/server";
import { APICallError, generateObject } from "ai";
import { z } from "zod";

import "server-only";
import { pickDmTextModel, readDmAiAvailability } from "@/lib/ai/dm-model";
import { aiErrorMessage } from "@/lib/ai/errors";
import { API_ERRORS } from "@/lib/constants/api-errors";
import type { Locale } from "@/lib/i18n/config";
import { languageName } from "@/lib/i18n/language-name";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import type { AiMapRequest } from "@/lib/schemas/content-import";
import type { Actor } from "@/lib/utils/api/actor";
import { errorResponse } from "@/lib/utils/api/api-response";
import { AI_PLAYER_RATE_LIMIT, checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { IMPORT_SPECS } from "@/lib/utils/content/import/fields";
import { IMPORT_LIMITS } from "@/lib/utils/content/import/kinds";
import type { AiMapResult, ImportField, ImportKind, ImportMapping, ImportSpec } from "@/types/content-import";

// an array of pairs: providers' structured output handles arbitrary object keys poorly
export const aiMapResultSchema = z.object({
  mapping: z.array(z.object({ header: z.string(), field: z.string().nullable() })).max(IMPORT_LIMITS.aiHeaders),
  notes: z.array(z.string().max(300)).max(5),
});

export function sanitizeAiMapping(raw: z.infer<typeof aiMapResultSchema>, headers: readonly string[], fields: readonly ImportField[]): AiMapResult {
  const keys = new Set(fields.map((f) => f.key));

  const known = new Set(headers);

  const mapping: ImportMapping = Object.fromEntries(headers.map((h) => [h, null]));

  for (const { header, field } of raw.mapping) {
    if (known.has(header)) mapping[header] = field && keys.has(field) ? field : null;
  }

  return { mapping, notes: raw.notes };
}

const fieldLine = (f: ImportField) =>
  `- ${f.key} (also known as: ${f.aliases.slice(0, 4).join(", ") || "-"}); type ${f.type}${f.enumValues ? ` (values: ${f.enumValues.join(" | ")})` : ""}${f.ref ? ` (record name of kind: ${f.ref})` : ""}${f.required ? "; required" : ""}`;

export function aiMapPrompt(spec: ImportSpec, headers: readonly string[], sample: ReadonlyArray<Record<string, string>>, locale: Locale): string {
  return [
    `You map the columns of a user's table to the import fields of the "${spec.kind}" content kind of a D&D campaign tracker.`,
    "Fields (key; known column names; type):",
    ...spec.fields.map(fieldLine),
    `File columns: ${JSON.stringify(headers)}`,
    `First rows (cells truncated): ${JSON.stringify(sample)}`,
    "For every column return { header, field }: field is the key of a field, or null when the column fits no field. One field gets at most one column, except abilities (several text columns of abilities).",
    `notes: up to 5 short tips on what the user will have to convert by hand (formats, units, values outside the list). Reply in ${languageName(locale)}.`,
  ].join("\n");
}

export async function aiMapAvailable(actor: Actor): Promise<boolean> {
  return (await readDmAiAvailability(actor.campaignId)).text;
}

export async function aiMapResponse(actor: Actor, kind: ImportKind, body: AiMapRequest): Promise<NextResponse> {
  const limit = await checkRateLimit({ userId: actor.userId, scope: "content-import-ai-map", battleId: actor.campaignId, ...AI_PLAYER_RATE_LIMIT, memoryFallback: true });

  if (!limit.allowed) return rateLimitResponse(limit);

  const model = await pickDmTextModel(actor.campaignId);

  if (!model) return errorResponse(API_ERRORS.IMPORT_AI_NO_KEY, 409);

  const spec = IMPORT_SPECS[kind];

  try {
    const { object } = await generateObject({ model, schema: aiMapResultSchema, prompt: aiMapPrompt(spec, body.headers, body.sample, await getRequestLocale()) });

    return NextResponse.json(sanitizeAiMapping(object, body.headers, spec.fields));
  } catch (error) {
    console.error("[ai import map]", APICallError.isInstance(error) ? error.statusCode : error instanceof Error ? error.name : "unknown");

    return errorResponse(aiErrorMessage(error), 502);
  }
}
