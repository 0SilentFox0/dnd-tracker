import type { BattleAudioCommand, BattleAudioState } from '@/types/audio';

export type PuzzleCut = 'classic' | 'organic' | 'straight';

export interface PuzzleSpec {
    cut: PuzzleCut;
    count: number;
    seed: number;
    imageWidth: number;
    imageHeight: number;
}

export interface PuzzleHolder {
    userId: string;
    name: string;
    until: number;
}

export interface PuzzlePieceState {
    x: number;
    y: number;
    rot: number;
    place: 'tray' | 'board';
    correct: boolean;
    holder?: PuzzleHolder;
}

export interface PuzzleState {
    pieces: Record<string, PuzzlePieceState>;
    solved: boolean;
}

export type PuzzleCommand =
    | { action: 'puzzleGrab'; pieceId: string }
    | { action: 'puzzleKeepAlive'; pieceId: string }
    | {
          action: 'puzzleDrop';
          pieceId: string;
          x: number;
          y: number;
          rot: number;
      }
    | { action: 'puzzleReturn'; pieceId: string }
    | { action: 'puzzleRelease'; pieceId?: string }
    | { action: 'puzzleReset' };

export interface Slide {
    id: string;
    imageUrl: string;
    title?: string;
    caption?: string;
    trackId?: string;
    kind?: 'puzzle';
    puzzle?: PuzzleSpec;
    audience?: string[];
}

export interface SlideTrailEntry {
    slide: Slide;
}

export interface ShowCover {
    deckId: string;
    slide: Slide;
}

export interface ShowBattle {
    id: string;
    name: string;
}

export interface ShowWorld {
    mapId: string;
    focusMarkerId?: string;
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

export interface ShowState {
    deckId: string | null;
    deckTitle: string | null;
    slide: Slide | null;
    nextImageUrl: string | null;
    audio: BattleAudioState | null;
    battle?: ShowBattle;
    cover?: ShowCover;
    curtain?: true;
    world?: ShowWorld;
    puzzle?: PuzzleState;
    trail?: SlideTrailEntry[];
    seq: number;
}

export type ShowCommand =
    | { action: 'open'; deckId: string; slideId?: string }
    | { action: 'next' }
    | { action: 'prev' }
    | { action: 'end' }
    | { action: 'audio'; command: BattleAudioCommand }
    | { action: 'battle'; battleId: string }
    | { action: 'curtain'; on?: boolean }
    | { action: 'world'; mapId: string; focusMarkerId?: string }
    | { action: 'worldOff' }
    | { action: 'setCover'; deckId: string; slideId: string }
    | { action: 'clearCover' };

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
    show?: ShowState;
    seq: number;
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
