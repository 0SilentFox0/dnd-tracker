import type { SlideDeck as DeckRow } from "@prisma/client";

import "server-only";
import { SCENE_SLIDES_BUCKET, SLIDE_CACHE_SECONDS } from "@/lib/constants/show";
import { prisma } from "@/lib/db";
import { readSlides } from "@/lib/schemas/show";
import { createAdminClient } from "@/lib/supabase/admin";
import { isHostedOnProjectStorage, resolveImageForPersistence } from "@/lib/supabase/image-storage";
import { ensureSlidesBucket } from "@/lib/supabase/scene-slide-storage";
import type { ShowDeck } from "@/lib/utils/show/show-command";
import type { Result } from "@/types/common";
import type { Slide, SlideDeck, SlideDeckSummary } from "@/types/show";

export const DECK_ORDER = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

export function toSlideDeck(row: DeckRow): SlideDeck {
  return { id: row.id, title: row.title, sortOrder: row.sortOrder, slides: readSlides(row.slides), updatedAt: row.updatedAt.toISOString() };
}

export function toDeckSummary(row: DeckRow): SlideDeckSummary {
  const slides = readSlides(row.slides);

  return { id: row.id, title: row.title, sortOrder: row.sortOrder, slideCount: slides.length, coverUrl: slides[0]?.imageUrl ?? null, updatedAt: row.updatedAt.toISOString() };
}

export async function listDecks(campaignId: string): Promise<SlideDeckSummary[]> {
  return (await prisma.slideDeck.findMany({ where: { campaignId }, orderBy: DECK_ORDER })).map(toDeckSummary);
}

export async function loadShowDeck(campaignId: string, deckId: string): Promise<ShowDeck | null> {
  const row = await prisma.slideDeck.findFirst({ where: { id: deckId, campaignId }, select: { id: true, title: true, slides: true } });

  return row ? { id: row.id, title: row.title, slides: readSlides(row.slides) } : null;
}

/** Картинки інших наборів кампанії: спільне посилання не можна стирати разом з одним набором. */
export async function urlsUsedElsewhere(campaignId: string, exceptDeckId: string): Promise<Set<string>> {
  const rows = await prisma.slideDeck.findMany({ where: { campaignId, id: { not: exceptDeckId } }, select: { slides: true } });

  return new Set(rows.flatMap((r) => readSlides(r.slides).map((s) => s.imageUrl)));
}

/** Зовнішні посилання дзеркалимо в бакет слайдів; наш Storage і вже збережені — як є. */
export async function persistSlideImages(campaignId: string, slides: Slide[], previous: Slide[]): Promise<Result<Slide[]>> {
  const known = new Set(previous.map((s) => s.imageUrl));

  const foreign = slides.filter((s) => !known.has(s.imageUrl) && !isHostedOnProjectStorage(s.imageUrl));

  if (foreign.length === 0) return { ok: true, value: slides };

  const ensured = await ensureSlidesBucket(createAdminClient());

  if (!ensured.ok) return ensured;

  const mirrored = new Map<string, string>();

  for (const slide of foreign) {
    if (mirrored.has(slide.imageUrl)) continue;

    const stored = await resolveImageForPersistence(slide.imageUrl, { bucket: SCENE_SLIDES_BUCKET, campaignId, cacheControl: SLIDE_CACHE_SECONDS });

    if (!stored.ok) return { ok: false, message: `Слайд ${slides.indexOf(slide) + 1}: ${stored.message}` };

    if (stored.value) mirrored.set(slide.imageUrl, stored.value);
  }

  return { ok: true, value: slides.map((s) => ({ ...s, imageUrl: mirrored.get(s.imageUrl) ?? s.imageUrl })) };
}
