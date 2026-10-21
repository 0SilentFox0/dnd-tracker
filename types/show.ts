import type { BattleAudioCommand, BattleAudioState } from "@/types/audio";

export interface Slide {
  id: string;
  imageUrl: string;
  title?: string;
  caption?: string;
  trackId?: string;
}

/** Заглушка кампанії: знімок обраного слайда (без треку). */
export interface ShowCover {
  deckId: string;
  slide: Slide;
}

export interface ShowBattle {
  id: string;
  name: string;
}

export interface SlideDeck {
  id: string;
  title: string;
  scenarioPageId: string | null;
  slides: Slide[];
  updatedAt: string;
}

export interface SlideDeckSummary {
  id: string;
  title: string;
  scenarioPageId: string | null;
  slideCount: number;
  coverUrl: string | null;
  updatedAt: string;
}

export interface DeckSceneData {
  scenarioPageId: string | null;
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
  /** Бій, до якого кличуть гравців; відсутнє — нікого не кличемо. */
  battle?: ShowBattle;
  cover?: ShowCover;
  /** Гравці бачать заглушку замість слайда; позиція в наборі й музика лишаються. */
  curtain?: true;
  seq: number;
}

export type ShowCommand =
  | { action: "open"; deckId: string; slideId?: string }
  | { action: "next" }
  | { action: "prev" }
  | { action: "end" }
  | { action: "audio"; command: BattleAudioCommand }
  | { action: "battle"; battleId: string }
  | { action: "curtain"; on: boolean }
  | { action: "setCover"; deckId: string; slideId: string }
  | { action: "clearCover" };

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
