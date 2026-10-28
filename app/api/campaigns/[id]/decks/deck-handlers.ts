import { after, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

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
import type { ShowState, Slide, SlideDeck } from "@/types/show";

const ownedDeck = (campaignId: string, deckId: string) => loadOwned(prisma.slideDeck.findUnique({ where: { id: deckId } }), campaignId, API_ERRORS.DECK_NOT_FOUND);

async function asDM(campaignId: string, action: string, run: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    return await run();
  } catch (error) {
    return handleApiError(error, { action });
  }
}

/** Картинка на екрані і картинки інших наборів лишаються. */
async function removeUnusedFiles(campaignId: string, deckId: string, slides: { before: Slide[]; remaining: Slide[] }, show: ShowState | null) {
  const removed = removedSlideUrls(slides.before, slides.remaining, show?.slide ? [show.slide.imageUrl] : []);

  if (removed.length === 0) return;

  const elsewhere = await urlsUsedElsewhere(campaignId, deckId);

  const urls = removed.filter((url) => !elsewhere.has(url));

  if (urls.length > 0) await removeSlideFiles(campaignId, urls);
}

/** Повертає стан показу після оновлення — з нього рахується, які файли ще на екрані. */
async function refreshShownDeck(campaignId: string, show: ShowState | null, saved: SlideDeck, before: Slide[]): Promise<ShowState | null> {
  const next = show && refreshShowSlide(show, saved, { before, now: Date.now() });

  // конфлікт з командою ДМ не страшний: наступне перемикання візьме свіжий набір
  if (!next || !(await writeShowState(campaignId, show, next))) return show;

  await publishShow(campaignId, next);

  return next;
}

const END_SHOW_ATTEMPTS = 3;

/** Показ не лишається вказувати на видалений набір. */
async function endShowOfDeck(campaignId: string, deckId: string): Promise<ShowState | null> {
  let show = await readShowState(campaignId);

  for (let attempt = 0; attempt < END_SHOW_ATTEMPTS && show?.deckId === deckId; attempt++) {
    const ended = applyShowCommand(show, { action: "end" }, { now: Date.now(), deck: null, library: [] });

    if (!ended.ok) return show;

    if (await writeShowState(campaignId, show, ended.value)) {
      await publishShow(campaignId, ended.value);

      return ended.value;
    }

    show = await readShowState(campaignId);
  }

  return show;
}

const isNotFound = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";

export function getDecksHandler(campaignId: string) {
  return asDM(campaignId, "list decks", async () => NextResponse.json(await listDecks(campaignId), { headers: { "Cache-Control": "no-store" } }));
}

export function createDeckHandler(req: Request, campaignId: string) {
  return asDM(campaignId, "create deck", async () => {
    const body = await parseBody(createDeckSchema, req);

    if (body instanceof NextResponse) return body;

    const existing = await prisma.slideDeck.aggregate({ where: { campaignId }, _count: true, _max: { sortOrder: true } });

    if (existing._count >= MAX_DECKS_PER_CAMPAIGN) return errorResponse(API_ERRORS.DECK_LIMIT, 400);

    const row = await prisma.slideDeck.create({ data: { campaignId, title: body.title, sortOrder: (existing._max.sortOrder ?? -1) + 1 } });

    return NextResponse.json(toSlideDeck(row), { status: 201 });
  });
}

export function getDeckHandler(campaignId: string, deckId: string) {
  return asDM(campaignId, "get deck", async () => {
    const deck = await ownedDeck(campaignId, deckId);

    if (deck instanceof NextResponse) return deck;

    return NextResponse.json(toSlideDeck(deck), { headers: { "Cache-Control": "no-store" } });
  });
}

export function saveDeckHandler(req: Request, campaignId: string, deckId: string) {
  return asDM(campaignId, "save deck", async () => {
    const body = await parseBody(saveDeckSchema, req);

    if (body instanceof NextResponse) return body;

    const deck = await ownedDeck(campaignId, deckId);

    if (deck instanceof NextResponse) return deck;

    if (deck.updatedAt.toISOString() !== body.expectedUpdatedAt) return errorResponse(API_ERRORS.DECK_CONFLICT, 409);

    const previous = readSlides(deck.slides);

    const slides = await persistSlideImages(campaignId, body.slides, previous);

    if (!slides.ok) return errorResponse(slides.message, 400);

    const row = await prisma.slideDeck
      .update({
        where: { id: deckId, campaignId, updatedAt: deck.updatedAt },
        data: { title: body.title, slides: slides.value as unknown as Prisma.InputJsonValue },
      })
      .catch((error: unknown) => {
        if (isNotFound(error)) return null;

        throw error;
      });

    if (!row) {
      // копії, зроблені цим запитом, нікуди не записані
      const mirrored = removedSlideUrls(slides.value, body.slides, []);

      if (mirrored.length > 0) await removeSlideFiles(campaignId, mirrored);

      return errorResponse(API_ERRORS.DECK_CONFLICT, 409);
    }

    const saved = toSlideDeck(row);

    after(async () => {
      const show = await refreshShownDeck(campaignId, await readShowState(campaignId), saved, previous);

      await removeUnusedFiles(campaignId, deckId, { before: previous, remaining: saved.slides }, show);
    });

    return NextResponse.json(saved);
  });
}

export function deleteDeckHandler(campaignId: string, deckId: string) {
  return asDM(campaignId, "delete deck", async () => {
    const deck = await ownedDeck(campaignId, deckId);

    if (deck instanceof NextResponse) return deck;

    await prisma.slideDeck.delete({ where: { id: deckId } });

    const previous = readSlides(deck.slides);

    after(async () => removeUnusedFiles(campaignId, deckId, { before: previous, remaining: [] }, await endShowOfDeck(campaignId, deckId)));

    return NextResponse.json({ ok: true });
  });
}

export function issueSlideUploadHandler(req: Request, campaignId: string) {
  return asDM(campaignId, "issue slide upload", async () => {
    const body = await parseBody(slideUploadRequestSchema, req);

    if (body instanceof NextResponse) return body;

    const ticket = await createSlideUploadTicket(campaignId, body.contentType);

    return ticket.ok ? NextResponse.json(ticket.value) : errorResponse(ticket.message, 500);
  });
}
