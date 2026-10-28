
import "server-only";
import { isKnownImageModel } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { readSlides } from "@/lib/schemas/show";
import { fullRowDigest, stampDigest } from "@/lib/server/assistant/digest";
import { jsonContent, requestDigest } from "@/lib/server/assistant/json";
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

    const body = input.body ?? {};

    if (operation === "decks.save" && snapshot.deck?.updatedAt.toISOString() !== body.expectedUpdatedAt) throw conflict();

    if (operation === "decks.scene" && body.scenarioPageId && !snapshot.scenes.some(p => p.id === body.scenarioPageId && p.kind === "scene")) throw new ContentError(API_ERRORS.DECK_SCENE_INVALID, 400);

    if (operation === "generate" && (!input.explicitRequest || !isKnownImageModel(body.provider as Parameters<typeof isKnownImageModel>[0], String(body.model)))) throw new ContentError(API_ERRORS.ASSISTANT_IMAGE_EXPLICIT_REQUEST, 400);

    if (operation === "decks.save") for (const slide of body.slides as Slide[]) {
      if (slide.trackId && !snapshot.tracks.some(t => t.id === slide.trackId)) throw new ContentError(API_ERRORS.TRACK_NOT_FOUND, 404);
    }

    const target = { domain: "show", id: input.deckId ?? caller.actor.campaignId, name: snapshot.deck?.title ?? "Показ" };

    const removed = operation === "decks.save" && readSlides(snapshot.deck?.slides).some(old => {
      const next = (body.slides as Slide[]).find(s => s.id === old.id);

      return !next || old.imageUrl !== next.imageUrl || (["title", "caption", "trackId"] as const).some(k => old[k] && !next[k]);
    });

    return { summary: `Показ: ${operation}`, targets: [target], changes: [{ target, path: operation, before: operation === "decks.save" ? safeMedia(snapshot.deck && toSlideDeck(snapshot.deck)) : null, after: jsonContent(input) }], warnings: [], effects: [{ kind: operation === "generate" ? "paid" : operation === "decks.delete" || operation === "discard" || removed ? "delete" : "update", targets: [target], description: operation }], preconditions: { fingerprint: requestDigest(jsonContent(snapshot)) } };
  });
}

/** Shared native/actor writer. Media has already been prepared outside the transaction. */
export async function runShowOperation(actor: Actor, operation: string, input: ShowInput, expected?: JsonValue, ctx?: ActionExecutionContext): Promise<ActionResult> {
  const read = ["get", "decks.list", "decks.get"].includes(operation);

  const run = async (): Promise<ActionResult> => {
    await access(actor, read);

    const snapshot = await state(actor, input);

    if (expected && requestDigest(jsonContent(snapshot)) !== (expected as { fingerprint: string }).fingerprint) throw conflict();

    const body = input.body ?? {};

    const campaignId = actor.campaignId;

    const affected = [{ domain: "show", id: input.deckId ?? campaignId, name: snapshot.deck?.title ?? "Показ" }];

    const result = (data: unknown): ActionResult => ({ data: safeMedia(data), affected, warnings: [] });

    const emit = async (next: ShowState) => {
      if (!(await writeShowState(campaignId, snapshot.show, next))) throw new ContentError(API_ERRORS.SHOW_CONFLICT, 409);

      if (ctx) ctx.afterCommit({ kind: "publish", key: "show", payload: jsonContent({ campaignId, show: next }) });
      else afterContentCommit(() => { void publishShow(campaignId, next); });
    };

    if (operation === "get") return result({ show: snapshot.show });

    if (operation === "decks.list") return result(await listDecks(campaignId));

    if (operation === "decks.get") return result(toSlideDeck(requiredDeck(snapshot.deck)));

    if (operation === "generate") {
      if (!ctx?.externalResult) throw new ContentError(API_ERRORS.ASSISTANT_NO_GENERATION_RESULT, 409);

      return result(ctx.externalResult);
    }

    if (operation === "discard") {
      const effect = { kind: "media-cleanup" as const, key: "show.discard", payload: { campaignId, urls: [String(body.url)] } };

      if (ctx) ctx.afterCommit(effect);
      else afterContentCommit(() => { void import("./media-effects").then(m => m.runShowMediaCleanup(effect.payload)); });

      return result({ scheduled: true });
    }

    if (operation === "command") {
      const rate = await checkRateLimit({ userId: actor.userId, scope: "show", battleId: campaignId, ...BATTLE_RATE_LIMITS.show });

      if (!rate.allowed) throw new ContentError(API_ERRORS.ASSISTANT_TOO_MANY_REQUESTS, 429);

      const next = await applyAndWriteShowCommand(campaignId, snapshot.show, body as ShowCommand);

      if (next !== snapshot.show) {
        if (ctx) ctx.afterCommit({ kind: "publish", key: "show", payload: jsonContent({ campaignId, show: next }) });
        else afterContentCommit(() => { void publishShow(campaignId, next); });
      }

      return result({ show: next });
    }

    if (operation === "decks.create") {
      const row = await createDeckRecord(campaignId, String(body.title));

      return result(toSlideDeck(row));
    }

    const deck = requiredDeck(snapshot.deck);

    if (operation === "decks.scene") {
      if (body.scenarioPageId && !snapshot.scenes.some(p => p.id === body.scenarioPageId && p.kind === "scene")) throw new ContentError(API_ERRORS.DECK_SCENE_INVALID, 400);

      return result(toSlideDeck(await bindDeckRecord(campaignId, deck.id, deck.updatedAt, body.scenarioPageId as string | null)));
    }

    const before = readSlides(deck.slides);

    let remaining: Slide[] = [];

    if (operation === "decks.save") {
      if (deck.updatedAt.toISOString() !== body.expectedUpdatedAt) throw conflict();

      remaining = ctx?.externalResult ? (ctx.externalResult as unknown as { slides: Slide[] }).slides : body.slides as Slide[];

      // No copying or provider call under the DB guard.
      if (remaining.some(s => !before.some(p => p.imageUrl === s.imageUrl) && !isHostedOnProjectStorage(s.imageUrl))) throw new ContentError(API_ERRORS.ASSISTANT_MEDIA_PREPARE_REQUIRED, 409);

      for (const s of remaining) if (s.trackId && !snapshot.tracks.some(t => t.id === s.trackId)) throw new ContentError(API_ERRORS.TRACK_NOT_FOUND, 404);

      const savedRow = await saveDeckRecord(campaignId, deck.id, deck.updatedAt, String(body.title), remaining);

      if (!savedRow) throw conflict();

      const saved = toSlideDeck(savedRow);

      const next = snapshot.show && refreshShowSlide(snapshot.show, saved, { before, now: Date.now() });

      if (next) await emit(next);

      queueRemoved();

      return result(saved);
    }

    if (operation !== "decks.delete") throw new ContentError(API_ERRORS.ASSISTANT_UNKNOWN_SHOW_ACTION, 400);

    await deleteDeckRecord(campaignId, deck.id);

    if (snapshot.show?.deckId === deck.id) {
      const ended = applyShowCommand(snapshot.show, { action: "end" }, { now: Date.now(), deck: null, library: [] });

      if (ended.ok) await emit(ended.value);
    }

    queueRemoved();

    return result({ ok: true });

    function queueRemoved() {
      const urls = before.filter(s => !remaining.some(n => n.imageUrl === s.imageUrl)).map(s => s.imageUrl);

      if (!urls.length) return;

      const payload = { campaignId, urls };

      if (ctx) ctx.afterCommit({ kind: "media-cleanup", key: "show.removed", payload });
      else afterContentCommit(() => { void import("./media-effects").then(m => m.runShowMediaCleanup(payload)); });
    }
  };

  return read ? run() : withCampaignContentWrite(actor.campaignId, run);
}
