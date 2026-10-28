import { API_ERRORS } from "@/lib/constants/api-errors";
import { BattleStatus } from "@/lib/constants/battle";
import { applyAudioCommand, type AudioLibraryEntry, commandNeedsLibrary } from "@/lib/utils/audio/audio-command";
import { initPuzzle } from "@/lib/utils/puzzle/puzzle-command";
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

const puzzleFor = (slide: Slide) => (slide.kind === "puzzle" && slide.puzzle ? { puzzle: initPuzzle(slide.puzzle) } : {});

const slideAt = (deck: ShowDeck, index: number) => ({ slide: deck.slides[index], nextImageUrl: deck.slides[index + 1]?.imageUrl ?? null });

/** Прибирає поле стану й піднімає seq. */
function without(prev: ShowState, ...keys: ("battle" | "curtain" | "cover" | "world")[]): ShowState {
  const next = { ...prev, seq: prev.seq + 1 };

  for (const key of keys) delete next[key];

  return next;
}

const keepCover = (prev: ShowState | null) => (prev?.cover ? { cover: prev.cover } : {});

/** on не задано — перемикання. */
function setCurtain(prev: ShowState | null, on = !prev?.curtain): Outcome {
  const base = prev ?? EMPTY;

  if (!!base.curtain === on) return prev ? done(prev) : fail(API_ERRORS.SHOW_NOT_RUNNING);

  return done(on ? { ...base, curtain: true, seq: base.seq + 1 } : without(base, "curtain"));
}

function setCover(prev: ShowState | null, slideId: string, deck: ShowDeck | null): Outcome {
  if (!deck) return fail(API_ERRORS.DECK_NOT_FOUND);

  const found = deck.slides.find((s) => s.id === slideId);

  if (!found) return fail(API_ERRORS.SLIDE_NOT_FOUND);

  const { trackId: _trackId, kind: _kind, puzzle: _puzzle, ...slide } = found;

  return done({ ...(prev ?? EMPTY), cover: { deckId: deck.id, slide }, seq: (prev?.seq ?? 0) + 1 });
}

/** null, якщо показ не вказує на цей бій. */
export function withoutBattle(prev: ShowState | null, battleId: string): ShowState | null {
  return prev?.battle?.id === battleId ? without(prev, "battle") : null;
}

function showWorld(prev: ShowState | null, mapId: string, focusMarkerId?: string): Outcome {
  if (prev?.world?.mapId === mapId && prev.world.focusMarkerId === focusMarkerId && !prev.curtain) return done(prev);

  const next = without(prev ?? EMPTY, "curtain");

  return done({ ...next, world: focusMarkerId ? { mapId, focusMarkerId } : { mapId } });
}

/** null, якщо показана карта/фокус-маркер не серед видалених. */
export function withoutWorldTargets(prev: ShowState | null, gone: { mapIds: string[]; markerIds: string[] }): ShowState | null {
  const world = prev?.world;

  if (!prev || !world) return null;

  if (gone.mapIds.includes(world.mapId)) return without(prev, "world");

  if (world.focusMarkerId && gone.markerIds.includes(world.focusMarkerId)) return { ...prev, world: { mapId: world.mapId }, seq: prev.seq + 1 };

  return null;
}

function moveTo(prev: ShowState | null, cmd: SlideCommand, ctx: Ctx): Outcome {
  if (cmd.action !== "open" && !prev?.deckId) return fail(API_ERRORS.SHOW_NOT_RUNNING);

  const { deck } = ctx;

  if (!deck) return fail(API_ERRORS.DECK_NOT_FOUND);

  if (deck.slides.length === 0) return fail(API_ERRORS.SHOW_DECK_EMPTY);

  const index = targetIndex(prev, cmd, deck);

  if (index === -1) return fail(API_ERRORS.SLIDE_NOT_FOUND);

  if (prev && cmd.action !== "open" && deck.slides[index].id === prev.slide?.id) return done(prev.battle || prev.curtain || prev.world ? without(prev, "battle", "curtain", "world") : prev);

  const at = slideAt(deck, index);

  return done({ deckId: deck.id, deckTitle: deck.title, ...at, audio: autoTrack(prev?.audio ?? null, at.slide.trackId, ctx), ...keepCover(prev), ...puzzleFor(at.slide), seq: (prev?.seq ?? 0) + 1 });
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
    case "world":
      return showWorld(prev, cmd.mapId, cmd.focusMarkerId);
    case "worldOff":
      if (!prev) return fail(API_ERRORS.SHOW_NOT_RUNNING);

      return done(prev.world ? without(prev, "world") : prev);
    case "setCover":
      return setCover(prev, cmd.slideId, ctx.deck);
    case "clearCover":
      if (!prev) return fail(API_ERRORS.SHOW_NOT_RUNNING);

      return done(prev.cover ? without(prev, "cover") : prev);
  }
}

const sameSlide = (a: Slide | null, b: Slide) => !!a && a.id === b.id && a.imageUrl === b.imageUrl && a.title === b.title && a.caption === b.caption && a.trackId === b.trackId && a.kind === b.kind && JSON.stringify(a.puzzle) === JSON.stringify(b.puzzle);

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

  const { puzzle: _puzzle, ...rest } = prev;

  const keepPuzzle = prev.puzzle && prev.slide?.id === slide.id && JSON.stringify(prev.slide.puzzle) === JSON.stringify(slide.puzzle);

  return { ...rest, deckTitle: deck.title, slide, nextImageUrl, ...(keepPuzzle ? { puzzle: prev.puzzle } : puzzleFor(slide)), seq: prev.seq + 1 };
}
