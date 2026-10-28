import { campaignDelete, campaignGet, campaignPatch, campaignPost, campaignPut } from "./client";

import { YEAR_CACHE_SECONDS } from "@/lib/constants/storage";
import { createClient } from "@/lib/supabase/client";
import type { CreateDeckData, DeckSceneData, SaveDeckData, SlideDeck, SlideDeckSummary, SlideUploadRequest, SlideUploadTicket } from "@/types/show";

export const getDecks = (campaignId: string) => campaignGet<SlideDeckSummary[]>(campaignId, "/decks", { cache: "no-store" });

export const getDeck = (campaignId: string, deckId: string) => campaignGet<SlideDeck>(campaignId, `/decks/${deckId}`, { cache: "no-store" });

export const createDeck = (campaignId: string, data: CreateDeckData) => campaignPost<SlideDeck>(campaignId, "/decks", data);

export const saveDeck = (campaignId: string, deckId: string, data: SaveDeckData) => campaignPut<SlideDeck>(campaignId, `/decks/${deckId}`, data);

export const setDeckScene = (campaignId: string, deckId: string, data: DeckSceneData) => campaignPatch<SlideDeck>(campaignId, `/decks/${deckId}`, data);

export const deleteDeck = (campaignId: string, deckId: string) => campaignDelete<{ ok: true }>(campaignId, `/decks/${deckId}`);

/** Файл іде з браузера прямо в Storage: тіло запиту до Vercel обмежене 4,5 МБ. */
export async function uploadSlideImage(campaignId: string, blob: Blob): Promise<string> {
  const request: SlideUploadRequest = { size: blob.size, contentType: blob.type };

  const ticket = await campaignPost<SlideUploadTicket>(campaignId, "/decks/upload-url", request);

  const { error } = await createClient().storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, blob, { contentType: ticket.contentType, cacheControl: YEAR_CACHE_SECONDS });

  if (error) throw new Error(`Не вдалося завантажити картинку: ${error.message}`);

  return ticket.publicUrl;
}
