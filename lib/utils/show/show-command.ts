import { API_ERRORS } from "@/lib/constants/api-errors";
import { applyAudioCommand, type AudioLibraryEntry, commandNeedsLibrary } from "@/lib/utils/audio/audio-command";
import type { BattleAudioState } from "@/types/audio";
import type { Result } from "@/types/common";
import type { ShowCommand, ShowState, Slide } from "@/types/show";

export interface ShowDeck {
  id: string;
  title: string;
  slides: Slide[];
}

interface Ctx {
  now: number;
  deck: ShowDeck | null;
  library: AudioLibraryEntry[];
}

type Outcome = Result<ShowState>;

const fail = (message: string): Outcome => ({ ok: false, message });

const done = (value: ShowState): Outcome => ({ ok: true, value });

const EMPTY: ShowState = { deckId: null, deckTitle: null, slide: null, nextImageUrl: null, audio: null, seq: 0 };

/** Трек слайда, на який перейде команда (без застосування). */
export function targetSlideTrack(prev: ShowState | null, cmd: ShowCommand, deck: ShowDeck | null): string | undefined {
  if (!deck || deck.slides.length === 0) return undefined;

  if (cmd.action === "open") return (cmd.slideId ? deck.slides.find((s) => s.id === cmd.slideId) : deck.slides[0])?.trackId;

  if (cmd.action !== "next" && cmd.action !== "prev") return undefined;

  const at = deck.slides.findIndex((s) => s.id === prev?.slide?.id);

  if (at === -1) return deck.slides[0].trackId;

  return deck.slides[Math.min(Math.max(at + (cmd.action === "next" ? 1 : -1), 0), deck.slides.length - 1)].trackId;
}

export function showNeedsLibrary(prev: ShowState | null, cmd: ShowCommand, deck: ShowDeck | null): boolean {
  if (cmd.action === "audio") return commandNeedsLibrary(cmd.command);

  const track = targetSlideTrack(prev, cmd, deck);

  return !!track && track !== prev?.audio?.trackId;
}

function autoTrack(audio: BattleAudioState | null, trackId: string | undefined, ctx: Ctx): BattleAudioState | null {
  // той самий трек — навіть на паузі — не чіпаємо: паузу ДМ поставив свідомо
  if (!trackId || audio?.trackId === trackId) return audio;

  const played = applyAudioCommand(audio, { action: "play", trackId }, ctx);

  return played.ok ? played.value : audio;
}

function showSlide(prev: ShowState | null, deck: ShowDeck, index: number, ctx: Ctx): Outcome {
  const slide = deck.slides[index];

  return done({
    deckId: deck.id,
    deckTitle: deck.title,
    slide,
    nextImageUrl: deck.slides[index + 1]?.imageUrl ?? null,
    audio: autoTrack(prev?.audio ?? null, slide.trackId, ctx),
    seq: (prev?.seq ?? 0) + 1,
  });
}

function step(prev: ShowState | null, ctx: Ctx, dir: 1 | -1): Outcome {
  if (!prev?.deckId) return fail(API_ERRORS.SHOW_NOT_RUNNING);

  const { deck } = ctx;

  if (!deck) return fail(API_ERRORS.DECK_NOT_FOUND);

  if (deck.slides.length === 0) return fail(API_ERRORS.SHOW_DECK_EMPTY);

  const at = deck.slides.findIndex((s) => s.id === prev.slide?.id);

  if (at === -1) return showSlide(prev, deck, 0, ctx);

  const target = Math.min(Math.max(at + dir, 0), deck.slides.length - 1);

  return target === at ? done(prev) : showSlide(prev, deck, target, ctx);
}

type Handlers = { [A in ShowCommand["action"]]: (prev: ShowState | null, cmd: Extract<ShowCommand, { action: A }>, ctx: Ctx) => Outcome };

const handlers: Handlers = {
  open: (prev, cmd, ctx) => {
    const { deck } = ctx;

    if (!deck) return fail(API_ERRORS.DECK_NOT_FOUND);

    if (deck.slides.length === 0) return fail(API_ERRORS.SHOW_DECK_EMPTY);

    const index = cmd.slideId ? deck.slides.findIndex((s) => s.id === cmd.slideId) : 0;

    return index === -1 ? fail(API_ERRORS.SLIDE_NOT_FOUND) : showSlide(prev, deck, index, ctx);
  },
  next: (prev, _cmd, ctx) => step(prev, ctx, 1),
  prev: (prev, _cmd, ctx) => step(prev, ctx, -1),
  end: (prev, _cmd, ctx) => {
    const audio = prev?.audio ?? null;

    const stopped = audio?.trackId ? applyAudioCommand(audio, { action: "stop" }, ctx) : null;

    return done({ ...EMPTY, audio: stopped?.ok ? stopped.value : audio, seq: (prev?.seq ?? 0) + 1 });
  },
  audio: (prev, cmd, ctx) => {
    const played = applyAudioCommand(prev?.audio ?? null, cmd.command, ctx);

    return played.ok ? done({ ...(prev ?? EMPTY), audio: played.value, seq: (prev?.seq ?? 0) + 1 }) : played;
  },
};

export function applyShowCommand(prev: ShowState | null, cmd: ShowCommand, ctx: Ctx): Outcome {
  const run = handlers[cmd.action] as (p: ShowState | null, c: ShowCommand, x: Ctx) => Outcome;

  return run(prev, cmd, ctx);
}

const sameSlide = (a: Slide | null, b: Slide) => !!a && a.imageUrl === b.imageUrl && a.title === b.title && a.caption === b.caption && a.trackId === b.trackId;

/** Після збереження набору: знімок поточного слайда без перемикання і без автотреку. */
export function refreshShowSlide(prev: ShowState, deck: ShowDeck): ShowState | null {
  if (prev.deckId !== deck.id) return null;

  const at = deck.slides.findIndex((s) => s.id === prev.slide?.id);

  if (at === -1) return null;

  const slide = deck.slides[at];

  const nextImageUrl = deck.slides[at + 1]?.imageUrl ?? null;

  if (sameSlide(prev.slide, slide) && nextImageUrl === prev.nextImageUrl && deck.title === prev.deckTitle) return null;

  return { ...prev, deckTitle: deck.title, slide, nextImageUrl, seq: prev.seq + 1 };
}
