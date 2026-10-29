import { z } from "zod";

import type { HandoffResult } from "../types";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/translator";
import { handoffContentKind, handoffId, isAssistantHandoffHref } from "@/lib/schemas/assistant-handoff";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import type { Actor } from "@/lib/utils/api/actor";

const empty = z.strictObject({});

export const HANDOFF_INPUTS = {
  credentials: empty,
  tokens: empty,
  invite: empty,
  "campaign-import": empty,
  "campaign-join": empty,
  "content-import": z.strictObject({ kind: handoffContentKind }),
  "ai-map": z.strictObject({ kind: handoffContentKind }),
  "slide-upload": z.strictObject({ deckId: handoffId.optional() }),
  "track-upload": empty,
  "player-draft": empty,
  "compendium-read": empty, "compendium-preview": empty,
  "compendium-confirm": empty,
  "source-notes": empty,
};

type HandoffKind = keyof typeof HANDOFF_INPUTS;

/** A link grants no rights. The destination keeps its current session/ownership guards. */
export async function buildAssistantHandoff(
  actor: Actor,
  kind: string,
  target: unknown = {},
  locale: Locale = DEFAULT_LOCALE
): Promise<HandoffResult> {
  if (!actor.isDM || !actor.userId)
    throw new ContentError(API_ERRORS.ASSISTANT_DM_ONLY, 403);

  const campaignId = parseInput(handoffId, actor.campaignId);

  if (!Object.hasOwn(HANDOFF_INPUTS, kind))
    throw new ContentError(API_ERRORS.ASSISTANT_UNKNOWN_HANDOFF, 400);

  const key = kind as HandoffKind;

  const input = parseInput(HANDOFF_INPUTS[key] as z.ZodType, target) as {
    kind?: z.infer<typeof handoffContentKind>;
    deckId?: string;
  };

  const base = `/campaigns/${campaignId}`;

  const content = input.kind === "tracks" ? "music" : input.kind;

  const href =
    key === "credentials"
      ? "/settings/ai"
      : key === "tokens"
      ? `${base}/dm/ai`
      : key === "invite"
      ? `${base}#invite`
      : key === "campaign-import"
      ? "/campaigns/new"
      : key === "campaign-join"
      ? "/campaigns"
      : key === "content-import" || key === "ai-map"
      ? `${base}/dm/${content}`
      : key === "slide-upload"
      ? `${base}/dm/show${input.deckId ? `/${input.deckId}` : ""}`
      : key === "track-upload"
      ? `${base}/dm/music`
      : key === "player-draft"
      ? `${base}/character/draft`
      : `${base}/dm/compendium`;

  if (!isAssistantHandoffHref(href))
    throw new ContentError(API_ERRORS.ASSISTANT_HANDOFF_UNAVAILABLE, 400);

  return { href, reason: (await getTranslator(locale, "assistant"))(`handoffs.${key}`) };
}
