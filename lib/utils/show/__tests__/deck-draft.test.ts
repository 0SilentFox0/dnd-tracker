import { describe, expect, it } from "vitest";

import { type DeckDraft, deckDraftReducer } from "../deck-draft";

const s = (id: string) => ({ id, imageUrl: `https://x/${id}.webp` });

const draft: DeckDraft = { title: "Т", slides: [s("a"), s("b"), s("c")] };

describe("deckDraftReducer", () => {
  it("move: вліво/вправо з обмеженням краями", () => {
    expect(deckDraftReducer(draft, { type: "move", id: "b", dir: -1 }).slides.map((x) => x.id)).toEqual(["b", "a", "c"]);
    expect(deckDraftReducer(draft, { type: "move", id: "c", dir: 1 })).toBe(draft);
    expect(deckDraftReducer(draft, { type: "move", id: "a", dir: -1 })).toBe(draft);
  });

  it("add/remove/update/rename/reset", () => {
    expect(deckDraftReducer(draft, { type: "add", slides: [s("d")] }).slides).toHaveLength(4);
    expect(deckDraftReducer(draft, { type: "remove", id: "a" }).slides.map((x) => x.id)).toEqual(["b", "c"]);
    expect(deckDraftReducer(draft, { type: "update", id: "b", patch: { caption: "Ніч" } }).slides[1]).toEqual({ ...s("b"), caption: "Ніч" });
    expect(deckDraftReducer(draft, { type: "rename", title: "Нова" }).title).toBe("Нова");
    expect(deckDraftReducer(draft, { type: "reset", draft: { title: "X", slides: [] } })).toEqual({ title: "X", slides: [] });
  });

  it("update з trackId undefined прибирає прив'язку", () => {
    const withTrack = deckDraftReducer(draft, { type: "update", id: "a", patch: { trackId: "t1" } });

    expect(deckDraftReducer(withTrack, { type: "update", id: "a", patch: { trackId: undefined } }).slides[0]).toEqual(s("a"));
  });
});
