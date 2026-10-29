import { z } from "zod";

import type { ActionExecutionContext, AssistantActionDef } from "../types";

import "server-only";
import { generateSlideImage } from "@/lib/ai/images";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { discardGeneratedImageSchema, generateSlideImageSchema } from "@/lib/schemas/ai";
import { readSlides } from "@/lib/schemas/show";
import { createDeckSchema, deckSceneSchema, saveDeckSchema, showCommandSchema } from "@/lib/schemas/show";
import { ContentError } from "@/lib/server/content/errors";
import { prepareShowAction, runShowOperation, type ShowInput } from "@/lib/server/show/action-service";
import { persistSlideImages } from "@/lib/server/show/deck-store";
import { jsonContent } from "@/lib/utils/common/json";

const deckId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

const deck = z.strictObject({ deckId });

const publicUrl = (url: string) => { const u = new URL(url);

 return !u.search && !u.hash && !u.username && !u.password; };

const save = saveDeckSchema.refine(v => v.slides.every(s => publicUrl(s.imageUrl)), "Public links without credentials are required");

export const SHOW_INPUTS = {
  get: z.strictObject({}), command: z.strictObject({ body: showCommandSchema }),
  "decks.list": z.strictObject({}), "decks.get": deck,
  "decks.create": z.strictObject({ body: createDeckSchema }),
  "decks.save": deck.extend({ body: save }), "decks.scene": deck.extend({ body: deckSceneSchema }), "decks.delete": deck,
  generate: z.strictObject({ explicitRequest: z.literal(true), body: generateSlideImageSchema }),
  discard: z.strictObject({ body: discardGeneratedImageSchema.refine(v => publicUrl(v.url)) }),
};

/** Inactive until T14; the legacy proposal writer remains the T6 adapter. */
export const SHOW_ACTIONS: readonly AssistantActionDef[] = Object.entries(SHOW_INPUTS).map(([operation, input]): AssistantActionDef => {
  const read = ["get", "decks.list", "decks.get"].includes(operation);

  const base = { id: `show.${operation}`, title: `Show: ${operation}`, description: "Slide decks, slides, bindings, the show and music. Generation only on explicit request, with human confirmation.", input, need: { access: "dm" as const, scope: read ? "show:read" as const : "show:write" as const } };

  if (read) return { ...base, effect: "read", execute: (caller, raw) => runShowOperation(caller.actor, operation, input.parse(raw) as ShowInput, undefined, undefined, caller.locale) };

  return { ...base, effect: operation === "generate" ? "paid" : "write", confirmation: ["generate", "discard", "decks.delete"].includes(operation) ? "always" : "standard",
    prepare: (caller, raw) => prepareShowAction(caller, operation, input.parse(raw) as ShowInput),
    ...(["generate", "decks.save"].includes(operation) && { external: async (caller, raw, signal) => {
      const value = input.parse(raw) as ShowInput;

      if (operation === "generate") return generateSlideImage({ ...generateSlideImageSchema.parse(value.body), campaignId: caller.actor.campaignId, userId: caller.actor.userId, abortSignal: signal });

      const saved = saveDeckSchema.parse(value.body);

      signal?.throwIfAborted();

      const previous = await prisma.slideDeck.findFirst({ where: { id: value.deckId, campaignId: caller.actor.campaignId }, select: { slides: true } });

      if (!previous) throw new ContentError(API_ERRORS.SHOW_SET_NOT_FOUND, 404);

      const result = await persistSlideImages(caller.actor.campaignId, saved.slides, readSlides(previous.slides));

      signal?.throwIfAborted();

      if (!result.ok) throw new ContentError(API_ERRORS.ASSISTANT_MEDIA_PREPARE_FAILED, 400);

      return jsonContent({ slides: result.value });
    } }),
    execute: (ctx: ActionExecutionContext, raw: unknown) => runShowOperation(ctx.caller.actor, operation, input.parse(raw) as ShowInput, ctx.expected, ctx),
  };
});
