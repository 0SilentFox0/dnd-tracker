import { API_ERRORS } from "@/lib/constants/api-errors";
import { BattleStatus } from "@/lib/constants/battle";
import { applyAudioCommand, type AudioLibraryEntry, commandNeedsLibrary } from "@/lib/utils/audio/audio-command";
import type { BattleAudioState } from "@/types/audio";
import type { Result } from "@/types/common";
import type { ShowBattle, ShowCommand, ShowState, Slide } from "@/types/show";

export interface ShowDeck {
  id: string;
  title: string;
  slides: Slide[];
}

interface Ctx {
  now: number;
  deck: ShowDeck | null;
  library: AudioLibraryEntry[];
  battle?: (ShowBattle & { status: string }) | null;
}

type Outcome = Result<ShowState>;

const fail = (message: string): Outcome => ({ ok: false, message });

const done = (value: ShowState): Outcome => ({ ok: true, value });

const EMPTY: ShowState = { deckId: null, deckTitle: null, slide: null, nextImageUrl: null, audio: null, seq: 0 };

type SlideCommand = Extract<ShowCommand, { action: "open" | "next" | "prev" }>;

const isSlideCommand = (cmd: ShowCommand): cmd is SlideCommand => cmd.action === "open" || cmd.action === "next" || cmd.action === "prev";

/** -1: слайда з open.slideId немає в наборі. */
function targetIndex(prev: ShowState | null, cmd: SlideCommand, deck: ShowDeck): number {
  if (cmd.action === "open") return cmd.slideId ? deck.slides.findIndex((s) => s.id === cmd.slideId) : 0;

  const at = deck.slides.findIndex((s) => s.id === prev?.slide?.id);

  return at === -1 ? 0 : Math.min(Math.max(at + (cmd.action === "next" ? 1 : -1), 0), deck.slides.length - 1);
}

export function targetSlideTrack(prev: ShowState | null, cmd: ShowCommand, deck: ShowDeck | null): string | undefined {
  if (!deck || deck.slides.length === 0 || !isSlideCommand(cmd)) return undefined;

  return deck.slides[targetIndex(prev, cmd, deck)]?.trackId;
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

const slideAt = (deck: ShowDeck, index: number) => ({ slide: deck.slides[index], nextImageUrl: deck.slides[index + 1]?.imageUrl ?? null });

const withoutBattleFlag = (prev: ShowState): ShowState => {
  const { battle: _battle, ...rest } = prev;

  return { ...rest, seq: prev.seq + 1 };
};

const withoutCurtain = (prev: ShowState): ShowState => {
  const { curtain: _curtain, ...rest } = prev;

  return rest;
};

const keepCover = (prev: ShowState | null) => (prev?.cover ? { cover: prev.cover } : {});

function setCurtain(prev: ShowState | null, on: boolean): Outcome {
  if (!!prev?.curtain === on) return prev ? done(prev) : fail(API_ERRORS.SHOW_NOT_RUNNING);

  const base = prev ?? EMPTY;

  return done({ ...(on ? { ...base, curtain: true } : withoutCurtain(base)), seq: base.seq + 1 });
}

function setCover(prev: ShowState | null, slideId: string, deck: ShowDeck | null): Outcome {
  if (!deck) return fail(API_ERRORS.DECK_NOT_FOUND);

  const found = deck.slides.find((s) => s.id === slideId);

  if (!found) return fail(API_ERRORS.SLIDE_NOT_FOUND);

  const { trackId: _trackId, ...slide } = found;

  return done({ ...(prev ?? EMPTY), cover: { deckId: deck.id, slide }, seq: (prev?.seq ?? 0) + 1 });
}

function clearCover(prev: ShowState | null): Outcome {
  if (!prev?.cover) return prev ? done(prev) : fail(API_ERRORS.SHOW_NOT_RUNNING);

  const { cover: _cover, ...rest } = prev;

  return done({ ...rest, seq: prev.seq + 1 });
}

/** null, якщо показ не вказує на цей бій. */
export function withoutBattle(prev: ShowState | null, battleId: string): ShowState | null {
  return prev?.battle?.id === battleId ? withoutBattleFlag(prev) : null;
}

function moveTo(prev: ShowState | null, cmd: SlideCommand, ctx: Ctx): Outcome {
  if (cmd.action !== "open" && !prev?.deckId) return fail(API_ERRORS.SHOW_NOT_RUNNING);

  const { deck } = ctx;

  if (!deck) return fail(API_ERRORS.DECK_NOT_FOUND);

  if (deck.slides.length === 0) return fail(API_ERRORS.SHOW_DECK_EMPTY);

  const index = targetIndex(prev, cmd, deck);

  if (index === -1) return fail(API_ERRORS.SLIDE_NOT_FOUND);

  if (prev && cmd.action !== "open" && deck.slides[index].id === prev.slide?.id) return prev.battle || prev.curtain ? done(withoutCurtain(withoutBattleFlag(prev))) : done(prev);

  const at = slideAt(deck, index);

  return done({ deckId: deck.id, deckTitle: deck.title, ...at, audio: autoTrack(prev?.audio ?? null, at.slide.trackId, ctx), ...keepCover(prev), seq: (prev?.seq ?? 0) + 1 });
}

function stopAudio(prev: ShowState | null, ctx: Ctx): BattleAudioState | null {
  const audio = prev?.audio ?? null;

  const stopped = audio?.trackId ? applyAudioCommand(audio, { action: "stop" }, ctx) : null;

  return stopped?.ok ? stopped.value : audio;
}

function callToBattle(prev: ShowState | null, battleId: string, ctx: Ctx): Outcome {
  const battle = ctx.battle;

  if (!battle || battle.id !== battleId) return fail(API_ERRORS.NOT_FOUND);

  if (battle.status !== BattleStatus.ACTIVE) return fail(API_ERRORS.SHOW_BATTLE_NOT_ACTIVE);

  return done({ ...(prev ?? EMPTY), audio: stopAudio(prev, ctx), battle: { id: battle.id, name: battle.name }, seq: (prev?.seq ?? 0) + 1 });
}

export function applyShowCommand(prev: ShowState | null, cmd: ShowCommand, ctx: Ctx): Outcome {
  switch (cmd.action) {
    case "open":
    case "next":
    case "prev":
      return moveTo(prev, cmd, ctx);
    case "end":
      return done({ ...EMPTY, audio: stopAudio(prev, ctx), ...keepCover(prev), seq: (prev?.seq ?? 0) + 1 });
    case "audio": {
      const played = applyAudioCommand(prev?.audio ?? null, cmd.command, ctx);

      return played.ok ? done({ ...(prev ?? EMPTY), audio: played.value, seq: (prev?.seq ?? 0) + 1 }) : played;
    }
    case "battle":
      return callToBattle(prev, cmd.battleId, ctx);
    case "curtain":
      return setCurtain(prev, cmd.on);
    case "setCover":
      return setCover(prev, cmd.slideId, ctx.deck);
    case "clearCover":
      return clearCover(prev);
  }
}

const sameSlide = (a: Slide | null, b: Slide) => !!a && a.id === b.id && a.imageUrl === b.imageUrl && a.title === b.title && a.caption === b.caption && a.trackId === b.trackId;

/** Після збереження набору: знімок поточного слайда без перемикання і без автотреку; видалений слайд замінює сусід, порожній набір завершує показ. */
export function refreshShowSlide(prev: ShowState, deck: ShowDeck, ctx: { before: Slide[]; now: number }): ShowState | null {
  if (prev.deckId !== deck.id) return null;

  if (deck.slides.length === 0) {
    const ended = applyShowCommand(prev, { action: "end" }, { now: ctx.now, deck: null, library: [] });

    return ended.ok ? ended.value : null;
  }

  let at = deck.slides.findIndex((s) => s.id === prev.slide?.id);

  if (at === -1) at = Math.min(Math.max(ctx.before.findIndex((s) => s.id === prev.slide?.id), 0), deck.slides.length - 1);

  const { slide, nextImageUrl } = slideAt(deck, at);

  if (sameSlide(prev.slide, slide) && nextImageUrl === prev.nextImageUrl && deck.title === prev.deckTitle) return null;

  return { ...prev, deckTitle: deck.title, slide, nextImageUrl, seq: prev.seq + 1 };
}
