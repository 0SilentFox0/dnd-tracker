
import "server-only";
import { isKnownImageModel } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/translator";
import { readSlides } from "@/lib/schemas/show";
import { fullRowDigest, stampDigest } from "@/lib/server/assistant/digest";
import { resultLabel } from "@/lib/server/assistant/result-labels";
import type { ActionExecutionContext, ActionPreview, ActionResult, AssistantCaller, JsonValue } from "@/lib/server/assistant/types";
import { assertCan } from "@/lib/server/content/access";
import { ContentError } from "@/lib/server/content/errors";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit } from "@/lib/server/content/write-context";
import { applyAndWriteShowCommand } from "@/lib/server/show/command-service";
import { bindDeckRecord, createDeckRecord, deleteDeckRecord, saveDeckRecord } from "@/lib/server/show/deck-operations";
import { listDecks, toSlideDeck } from "@/lib/server/show/deck-store";
import { publishShow, readShowState, writeShowState } from "@/lib/server/show/show-store";
import { isHostedOnProjectStorage } from "@/lib/supabase/image-storage";
import type { Actor } from "@/lib/utils/api/actor";
import { isDmMember } from "@/lib/utils/api/is-dm";
import { BATTLE_RATE_LIMITS, checkRateLimit } from "@/lib/utils/api/rate-limit";
import { requestDigest } from "@/lib/utils/battle/store/stable-json";
import { jsonContent } from "@/lib/utils/common/json";
import { ownHandler } from "@/lib/utils/common/own-handler";
import { applyShowCommand, refreshShowSlide } from "@/lib/utils/show/show-command";
import type { ShowCommand, ShowState, Slide } from "@/types/show";

export type ShowInput = { deckId?: string; body?: Record<string, unknown>; explicitRequest?: true };

function safeMedia(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value, (key, v) => {
    if (typeof v !== "string" || !["url", "imageUrl", "nextImageUrl", "coverUrl"].includes(key)) return v;

    try { const u = new URL(v);

 return u.search || u.hash || u.username || u.password ? null : v; } catch { return null; }
  }));
}

const conflict = () => new ContentError(API_ERRORS.DECK_CONFLICT, 409);

function requiredDeck<T>(deck: T | undefined): T {
  if (!deck) throw new ContentError(API_ERRORS.DECK_NOT_FOUND, 404);

  return deck;
}

async function access(actor: Actor, read = false) {
  assertCan(actor, { access: "dm", scope: read ? "show:read" : "show:write" });

  if (!isDmMember(await prisma.campaignMember.findMany({ where: { campaignId: actor.campaignId, userId: actor.userId }, select: { role: true } }))) throw new ContentError(API_ERRORS.FORBIDDEN, 403);
}

/** Includes bindings (which deliberately preserve updatedAt), show/audio seq, and refs. */
async function state(actor: Actor, input: ShowInput) {
  const campaignId = actor.campaignId;

  const [decks, deck, show, scenes, tracks, tracksDigest, battles] = await Promise.all([
    stampDigest(prisma, "SlideDeck", { campaignId }),
    input.deckId ? prisma.slideDeck.findFirst({ where: { id: input.deckId, campaignId } }).then(row => row ?? undefined) : undefined,
    readShowState(campaignId),
    prisma.scenarioPage.findMany({ where: { campaignId }, select: { id: true, kind: true }, orderBy: { id: "asc" } }),
    prisma.campaignTrack.findMany({ where: { campaignId }, select: { id: true }, orderBy: { id: "asc" } }),
    fullRowDigest(prisma, "campaign_tracks", campaignId),
    prisma.battleScene.findMany({ where: { campaignId }, select: { id: true, name: true, status: true }, orderBy: { id: "asc" } }),
  ]);

  if (input.deckId && !deck) throw new ContentError(API_ERRORS.DECK_NOT_FOUND, 404);

  return { decks, deck, show, scenes, tracks, tracksDigest, battles };
}

export async function prepareShowAction(caller: AssistantCaller, operation: string, input: ShowInput): Promise<ActionPreview> {
  return withCampaignContentWrite(caller.actor.campaignId, async () => {
    await access(caller.actor);

    const snapshot = await state(caller.actor, input);

    const t = await getTranslator(caller.locale, "assistant");

    const body = input.body ?? {};

    if (operation === "decks.save" && snapshot.deck?.updatedAt.toISOString() !== body.expectedUpdatedAt) throw conflict();

    if (operation === "decks.scene" && body.scenarioPageId && !snapshot.scenes.some(p => p.id === body.scenarioPageId && p.kind === "scene")) throw new ContentError(API_ERRORS.DECK_SCENE_INVALID, 400);

    if (operation === "generate" && (!input.explicitRequest || !isKnownImageModel(body.provider as Parameters<typeof isKnownImageModel>[0], String(body.model)))) throw new ContentError(API_ERRORS.ASSISTANT_IMAGE_EXPLICIT_REQUEST, 400);

    if (operation === "decks.save") for (const slide of body.slides as Slide[]) {
      if (slide.trackId && !snapshot.tracks.some(t => t.id === slide.trackId)) throw new ContentError(API_ERRORS.TRACK_NOT_FOUND, 404);
    }

    const target = { domain: "show", id: input.deckId ?? caller.actor.campaignId, name: snapshot.deck?.title ?? t("results.show") };

    const removed = operation === "decks.save" && readSlides(snapshot.deck?.slides).some(old => {
      const next = (body.slides as Slide[]).find(s => s.id === old.id);

      return !next || old.imageUrl !== next.imageUrl || (["title", "caption", "trackId"] as const).some(k => old[k] && !next[k]);
    });

    return { summary: t("summary.show", { operation }), targets: [target], changes: [{ target, path: operation, before: operation === "decks.save" ? safeMedia(snapshot.deck && toSlideDeck(snapshot.deck)) : null, after: jsonContent(input) }], warnings: [], effects: [{ kind: operation === "generate" ? "paid" : operation === "decks.delete" || operation === "discard" || removed ? "delete" : "update", targets: [target], description: operation }], preconditions: { fingerprint: requestDigest(jsonContent(snapshot)) } };
  });
}

type ShowRun = {
  actor: Actor;
  body: Record<string, unknown>;
  snapshot: Awaited<ReturnType<typeof state>>;
  ctx?: ActionExecutionContext;
  result: (data: unknown) => ActionResult;
  emit: (next: ShowState) => Promise<void>;
  schedulePublish: (next: ShowState) => void;
  scheduleCleanup: (effect: { kind: "media-cleanup"; key: string; payload: JsonValue }) => void;
};

type ShowHandler = (run: ShowRun) => Promise<ActionResult>;

function queueRemoved(run: ShowRun, before: Slide[], remaining: Slide[]) {
  const urls = before.filter(s => !remaining.some(n => n.imageUrl === s.imageUrl)).map(s => s.imageUrl);

  if (!urls.length) return;

  run.scheduleCleanup({ kind: "media-cleanup", key: "show.removed", payload: { campaignId: run.actor.campaignId, urls } });
}

const validSceneBinding = (snapshot: ShowRun["snapshot"], pageId: unknown) => !pageId || snapshot.scenes.some(p => p.id === pageId && p.kind === "scene");

async function saveDeck(run: ShowRun): Promise<ActionResult> {
  const { body, snapshot, ctx } = run;

  const campaignId = run.actor.campaignId;

  const deck = requiredDeck(snapshot.deck);

  const before = readSlides(deck.slides);

  if (deck.updatedAt.toISOString() !== body.expectedUpdatedAt) throw conflict();

  const remaining = ctx?.externalResult ? (ctx.externalResult as unknown as { slides: Slide[] }).slides : body.slides as Slide[];

  // No copying or provider call under the DB guard.
  if (remaining.some(s => !before.some(p => p.imageUrl === s.imageUrl) && !isHostedOnProjectStorage(s.imageUrl))) throw new ContentError(API_ERRORS.ASSISTANT_MEDIA_PREPARE_REQUIRED, 409);

  for (const s of remaining) if (s.trackId && !snapshot.tracks.some(t => t.id === s.trackId)) throw new ContentError(API_ERRORS.TRACK_NOT_FOUND, 404);

  const savedRow = await saveDeckRecord(campaignId, deck.id, deck.updatedAt, String(body.title), remaining);

  if (!savedRow) throw conflict();

  const saved = toSlideDeck(savedRow);

  const next = snapshot.show && refreshShowSlide(snapshot.show, saved, { before, now: Date.now() });

  if (next) await run.emit(next);

  queueRemoved(run, before, remaining);

  return run.result(saved);
}

async function deleteDeck(run: ShowRun): Promise<ActionResult> {
  const { snapshot } = run;

  const deck = requiredDeck(snapshot.deck);

  const before = readSlides(deck.slides);

  await deleteDeckRecord(run.actor.campaignId, deck.id);

  if (snapshot.show?.deckId === deck.id) {
    const ended = applyShowCommand(snapshot.show, { action: "end" }, { now: Date.now(), deck: null, library: [] });

    if (ended.ok) await run.emit(ended.value);
  }

  queueRemoved(run, before, []);

  return run.result({ ok: true });
}

const SHOW_HANDLERS: Record<string, ShowHandler> = {
  get: async ({ result, snapshot }) => result({ show: snapshot.show }),
  "decks.list": async ({ result, actor }) => result(await listDecks(actor.campaignId)),
  "decks.get": async ({ result, snapshot }) => result(toSlideDeck(requiredDeck(snapshot.deck))),
  generate: async ({ result, ctx }) => {
    if (!ctx?.externalResult) throw new ContentError(API_ERRORS.ASSISTANT_NO_GENERATION_RESULT, 409);

    return result(ctx.externalResult);
  },
  discard: async ({ result, body, actor, scheduleCleanup }) => {
    scheduleCleanup({ kind: "media-cleanup", key: "show.discard", payload: { campaignId: actor.campaignId, urls: [String(body.url)] } });

    return result({ scheduled: true });
  },
  command: async ({ result, body, actor, snapshot, schedulePublish }) => {
    const rate = await checkRateLimit({ userId: actor.userId, scope: "show", battleId: actor.campaignId, ...BATTLE_RATE_LIMITS.show });

    if (!rate.allowed) throw new ContentError(API_ERRORS.ASSISTANT_TOO_MANY_REQUESTS, 429);

    const next = await applyAndWriteShowCommand(actor.campaignId, snapshot.show, body as ShowCommand);

    if (next !== snapshot.show) schedulePublish(next);

    return result({ show: next });
  },
  "decks.create": async ({ result, body, actor }) => result(toSlideDeck(await createDeckRecord(actor.campaignId, String(body.title)))),
  "decks.scene": async ({ result, body, actor, snapshot }) => {
    const deck = requiredDeck(snapshot.deck);

    if (!validSceneBinding(snapshot, body.scenarioPageId)) throw new ContentError(API_ERRORS.DECK_SCENE_INVALID, 400);

    return result(toSlideDeck(await bindDeckRecord(actor.campaignId, deck.id, deck.updatedAt, body.scenarioPageId as string | null)));
  },
  "decks.save": saveDeck,
  "decks.delete": deleteDeck,
};

/** Shared native/actor writer. Media has already been prepared outside the transaction. */
export async function runShowOperation(actor: Actor, operation: string, input: ShowInput, expected?: JsonValue, ctx?: ActionExecutionContext, locale: Locale = ctx?.caller.locale ?? DEFAULT_LOCALE): Promise<ActionResult> {
  const read = ["get", "decks.list", "decks.get"].includes(operation);

  const run = async (): Promise<ActionResult> => {
    await access(actor, read);

    const snapshot = await state(actor, input);

    if (expected && requestDigest(jsonContent(snapshot)) !== (expected as { fingerprint: string }).fingerprint) throw conflict();

    const campaignId = actor.campaignId;

    const affected = [{ domain: "show", id: input.deckId ?? campaignId, name: snapshot.deck?.title ?? resultLabel(locale, "show") }];

    const schedulePublish = (next: ShowState) => {
      if (ctx) ctx.afterCommit({ kind: "publish", key: "show", payload: jsonContent({ campaignId, show: next }) });
      else afterContentCommit(() => publishShow(campaignId, next));
    };

    const showRun: ShowRun = {
      actor, snapshot, ctx, schedulePublish,
      body: input.body ?? {},
      result: (data) => ({ data: safeMedia(data), affected, warnings: [] }),
      scheduleCleanup: (effect) => {
        if (ctx) ctx.afterCommit(effect);
        else afterContentCommit(async () => (await import("./media-effects")).runShowMediaCleanup(effect.payload));
      },
      emit: async (next) => {
        if (!(await writeShowState(campaignId, snapshot.show, next))) throw new ContentError(API_ERRORS.SHOW_CONFLICT, 409);

        schedulePublish(next);
      },
    };

    const handler = ownHandler(SHOW_HANDLERS, operation);

    if (!handler) {
      requiredDeck(snapshot.deck);

      throw new ContentError(API_ERRORS.ASSISTANT_UNKNOWN_SHOW_ACTION, 400);
    }

    return handler(showRun);
  };

  return read ? run() : withCampaignContentWrite(actor.campaignId, run);
}
