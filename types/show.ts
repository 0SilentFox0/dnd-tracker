import type { BattleAudioCommand, BattleAudioState } from "@/types/audio";

export interface Slide {
  id: string;
  imageUrl: string;
  title?: string;
  caption?: string;
  trackId?: string;
}

export interface SlideDeck {
  id: string;
  title: string;
  slides: Slide[];
  updatedAt: string;
}

export interface SlideDeckSummary {
  id: string;
  title: string;
  slideCount: number;
  coverUrl: string | null;
  updatedAt: string;
}

export interface CreateDeckData {
  title: string;
}

export interface SaveDeckData {
  title: string;
  slides: Slide[];
  expectedUpdatedAt: string;
}

/** Те, що бачать усі учасники: лише поточний слайд і картинка наступного (без набору — спойлери). */
export interface ShowState {
  deckId: string | null;
  deckTitle: string | null;
  slide: Slide | null;
  nextImageUrl: string | null;
  audio: BattleAudioState | null;
  seq: number;
}

export type ShowCommand =
  | { action: "open"; deckId: string; slideId?: string }
  | { action: "next" }
  | { action: "prev" }
  | { action: "end" }
  | { action: "audio"; command: BattleAudioCommand };

export interface ShowResponse {
  show: ShowState | null;
}

export interface ShowSnapshot {
  show: ShowState | null;
  clockOffsetMs: number | null;
}

/** Pusher `show-state` */
export interface ShowEvent {
  campaignId: string;
  show: ShowState;
}

export interface SlideUploadRequest {
  size: number;
  contentType: string;
}

export interface SlideUploadTicket {
  bucket: string;
  path: string;
  token: string;
  contentType: string;
  publicUrl: string;
}
