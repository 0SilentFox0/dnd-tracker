import type { Slide } from "@/types/show";

export interface DeckDraft {
  title: string;
  slides: Slide[];
}

export type SlidePatch = Partial<Pick<Slide, "title" | "caption" | "trackId">>;

export type DeckDraftAction =
  | { type: "reset"; draft: DeckDraft }
  | { type: "rename"; title: string }
  | { type: "add"; slides: Slide[] }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; dir: -1 | 1 }
  | { type: "update"; id: string; patch: SlidePatch };

function patchSlide(slide: Slide, patch: SlidePatch): Slide {
  const next: Slide = { ...slide, ...patch };

  for (const key of Object.keys(patch) as (keyof SlidePatch)[]) if (next[key] === undefined || next[key] === "") delete next[key];

  return next;
}

export function deckDraftReducer(state: DeckDraft, action: DeckDraftAction): DeckDraft {
  switch (action.type) {
    case "reset":
      return action.draft;
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
