import type { Slide } from "@/types/show";

export interface DeckDraft {
  title: string;
  slides: Slide[];
}

type SlidePatch = Partial<Pick<Slide, "title" | "caption" | "trackId">>;

export type DeckDraftAction =
  | { type: "reset"; draft: DeckDraft }
  | { type: "saved"; sent: DeckDraft; saved: DeckDraft }
  | { type: "rename"; title: string }
  | { type: "add"; slides: Slide[] }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; dir: -1 | 1 }
  | { type: "update"; id: string; patch: SlidePatch };

export const newSlideId = () => `slide-${crypto.randomUUID()}`;

const sameSlide = (a: Slide, b: Slide) => a.id === b.id && a.imageUrl === b.imageUrl && a.title === b.title && a.caption === b.caption && a.trackId === b.trackId;

export const sameDraft = (a: DeckDraft, b: DeckDraft) => a === b || (a.title === b.title && a.slides.length === b.slides.length && a.slides.every((s, i) => sameSlide(s, b.slides[i])));

/** Правки, зроблені під час збереження, лишаються; сервер міг лише віддзеркалити зовнішні картинки — їх переносимо в незмінені слайди. */
function rebaseOnSaved(state: DeckDraft, sent: DeckDraft, saved: DeckDraft): DeckDraft {
  if (sameDraft(state, sent)) return saved;

  const sentUrls = new Map(sent.slides.map((s) => [s.id, s.imageUrl]));

  const savedUrls = new Map(saved.slides.map((s) => [s.id, s.imageUrl]));

  let changed = false;

  const slides = state.slides.map((s) => {
    const url = savedUrls.get(s.id);

    if (!url || url === s.imageUrl || sentUrls.get(s.id) !== s.imageUrl) return s;

    changed = true;

    return { ...s, imageUrl: url };
  });

  return changed ? { ...state, slides } : state;
}

function patchSlide(slide: Slide, patch: SlidePatch): Slide {
  const next: Slide = { ...slide, ...patch };

  for (const key of Object.keys(patch) as (keyof SlidePatch)[]) if (next[key] === undefined || next[key] === "") delete next[key];

  return next;
}

export function deckDraftReducer(state: DeckDraft, action: DeckDraftAction): DeckDraft {
  switch (action.type) {
    case "reset":
      return action.draft;
    case "saved":
      return rebaseOnSaved(state, action.sent, action.saved);
    case "rename":
      return { ...state, title: action.title };
    case "add":
      return { ...state, slides: [...state.slides, ...action.slides] };
    case "remove":
      return { ...state, slides: state.slides.filter((s) => s.id !== action.id) };
    case "update":
      return { ...state, slides: state.slides.map((s) => (s.id === action.id ? patchSlide(s, action.patch) : s)) };
    case "move": {
      const at = state.slides.findIndex((s) => s.id === action.id);

      const to = at + action.dir;

      if (at === -1 || to < 0 || to >= state.slides.length) return state;

      const slides = [...state.slides];

      [slides[at], slides[to]] = [slides[to], slides[at]];

      return { ...state, slides };
    }
  }
}
