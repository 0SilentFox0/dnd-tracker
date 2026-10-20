import { after, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_DECKS_PER_CAMPAIGN } from "@/lib/constants/show";
import { prisma } from "@/lib/db";
import { createDeckSchema, readSlides, saveDeckSchema, slideUploadRequestSchema } from "@/lib/schemas/show";
import { listDecks, persistSlideImages, toSlideDeck, urlsUsedElsewhere } from "@/lib/server/show/deck-store";
import { publishShow, readShowState, writeShowState } from "@/lib/server/show/show-store";
import { createSlideUploadTicket, removeSlideFiles } from "@/lib/supabase/scene-slide-storage";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { removedSlideUrls } from "@/lib/utils/show/deck-files";
import { applyShowCommand, refreshShowSlide } from "@/lib/utils/show/show-command";
import type { ShowState, Slide } from "@/types/show";

const ownedDeck = (campaignId: string, deckId: string) => loadOwned(prisma.slideDeck.findUnique({ where: { id: deckId } }), campaignId, API_ERRORS.DECK_NOT_FOUND);

/** Стерти файли, що зникли, крім картинки на екрані і картинок інших наборів. */
async function removeUnusedFiles(campaignId: string, deckId: string, before: Slide[], after_: Slide[], shown?: ShowState | null) {
  const [show, elsewhere] = await Promise.all([shown === undefined ? readShowState(campaignId) : shown, urlsUsedElsewhere(campaignId, deckId)]);

  const keep = [...elsewhere, ...(show?.slide ? [show.slide.imageUrl] : [])];

  const urls = removedSlideUrls(before, after_, keep);

  if (urls.length > 0) await removeSlideFiles(campaignId, urls);
}

const cleanupLater = (campaignId: string, deckId: string, before: Slide[], after_: Slide[]) => after(() => removeUnusedFiles(campaignId, deckId, before, after_));

/** Показ не лишається вказувати на видалений набір. */
async function endShowOfDeck(campaignId: string, deckId: string): Promise<ShowState | null | undefined> {
  const show = await readShowState(campaignId);

  if (show?.deckId !== deckId) return undefined;

  const ended = applyShowCommand(show, { action: "end" }, { now: Date.now(), deck: null, library: [] });

  if (!ended.ok || !(await writeShowState(campaignId, show, ended.value))) return undefined;

  await publishShow(campaignId, ended.value);

  return ended.value;
}

export async function getDecksHandler(campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    return NextResponse.json(await listDecks(campaignId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, { action: "list decks" });
  }
}

export async function createDeckHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(createDeckSchema, req);

    if (body instanceof NextResponse) return body;

    if ((await prisma.slideDeck.count({ where: { campaignId } })) >= MAX_DECKS_PER_CAMPAIGN) return errorResponse(API_ERRORS.DECK_LIMIT, 400);

    const last = await prisma.slideDeck.aggregate({ where: { campaignId }, _max: { sortOrder: true } });

    const row = await prisma.slideDeck.create({ data: { campaignId, title: body.title, sortOrder: (last._max.sortOrder ?? -1) + 1 } });

    return NextResponse.json(toSlideDeck(row), { status: 201 });
  } catch (error) {
    return handleApiError(error, { action: "create deck" });
  }
}

export async function getDeckHandler(campaignId: string, deckId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const deck = await ownedDeck(campaignId, deckId);

    if (deck instanceof NextResponse) return deck;

    return NextResponse.json(toSlideDeck(deck), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, { action: "get deck" });
  }
}

export async function saveDeckHandler(req: Request, campaignId: string, deckId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(saveDeckSchema, req);

    if (body instanceof NextResponse) return body;

    const deck = await ownedDeck(campaignId, deckId);

    if (deck instanceof NextResponse) return deck;

    if (deck.updatedAt.toISOString() !== body.expectedUpdatedAt) return errorResponse(API_ERRORS.DECK_CONFLICT, 409);

    const previous = readSlides(deck.slides);

    const slides = await persistSlideImages(campaignId, body.slides, previous);

    if (!slides.ok) return errorResponse(slides.message, 400);

    const written = await prisma.slideDeck.updateMany({
      where: { id: deckId, campaignId, updatedAt: deck.updatedAt },
      data: { title: body.title, slides: slides.value as unknown as Prisma.InputJsonValue },
    });

    if (written.count === 0) return errorResponse(API_ERRORS.DECK_CONFLICT, 409);

    const row = await prisma.slideDeck.findUnique({ where: { id: deckId } });

    if (!row) return errorResponse(API_ERRORS.DECK_NOT_FOUND, 404);

    const saved = toSlideDeck(row);

    cleanupLater(campaignId, deckId, previous, saved.slides);

    after(async () => {
      const show = await readShowState(campaignId);

      const next = show && refreshShowSlide(show, saved);

      // конфлікт з командою ДМ не страшний: наступне перемикання візьме свіжий набір
      if (next && (await writeShowState(campaignId, show, next))) await publishShow(campaignId, next);
    });

    return NextResponse.json(saved);
  } catch (error) {
    return handleApiError(error, { action: "save deck" });
  }
}

export async function deleteDeckHandler(campaignId: string, deckId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const deck = await ownedDeck(campaignId, deckId);

    if (deck instanceof NextResponse) return deck;

    await prisma.slideDeck.delete({ where: { id: deckId } });

    const previous = readSlides(deck.slides);

    after(async () => removeUnusedFiles(campaignId, deckId, previous, [], await endShowOfDeck(campaignId, deckId)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { action: "delete deck" });
  }
}

export async function issueSlideUploadHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(slideUploadRequestSchema, req);

    if (body instanceof NextResponse) return body;

    const ticket = await createSlideUploadTicket(campaignId, body.contentType);

    return ticket.ok ? NextResponse.json(ticket.value) : errorResponse(ticket.message, 500);
  } catch (error) {
    return handleApiError(error, { action: "issue slide upload" });
  }
}
