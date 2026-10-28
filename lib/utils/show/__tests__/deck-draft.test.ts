import { describe, expect, it } from "vitest";

import { type DeckDraft, deckDraftReducer, sameDraft } from "../deck-draft";

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

describe("sameDraft", () => {
  it("порівнює за значенням: повернута вручну правка — та сама чернетка", () => {
    const renamed = deckDraftReducer(draft, { type: "rename", title: "Нова" });

    expect(sameDraft(draft, renamed)).toBe(false);
    expect(sameDraft(draft, deckDraftReducer(renamed, { type: "rename", title: "Т" }))).toBe(true);
    expect(sameDraft(draft, { title: "Т", slides: draft.slides.map((x) => ({ ...x })) })).toBe(true);
  });

  it("порядок, підпис, трек і картинка слайда мають значення", () => {
    expect(sameDraft(draft, deckDraftReducer(draft, { type: "move", id: "a", dir: 1 }))).toBe(false);
    expect(sameDraft(draft, deckDraftReducer(draft, { type: "update", id: "a", patch: { caption: "x" } }))).toBe(false);
    expect(sameDraft(draft, deckDraftReducer(draft, { type: "update", id: "a", patch: { trackId: "t" } }))).toBe(false);
    expect(sameDraft(draft, { ...draft, slides: [{ ...s("a"), imageUrl: "https://y" }, s("b"), s("c")] })).toBe(false);
    expect(sameDraft(draft, deckDraftReducer(draft, { type: "remove", id: "c" }))).toBe(false);
  });
});

describe("deckDraftReducer: saved", () => {
  const mirrored = (id: string) => ({ id, imageUrl: `https://store/${id}.webp` });

  const sent: DeckDraft = { title: "Т", slides: [s("a"), s("b")] };

  const saved: DeckDraft = { title: "Т", slides: [mirrored("a"), mirrored("b")] };

  it("чернетка не змінилась під час збереження — береться відповідь сервера", () => {
    expect(deckDraftReducer({ ...sent, slides: [...sent.slides] }, { type: "saved", sent, saved })).toBe(saved);
  });

  it("правки під час збереження лишаються, дзеркальні URL переносяться лише в незмінені картинки", () => {
    const current: DeckDraft = { title: "Нова", slides: [{ ...s("a"), caption: "Ніч" }, { id: "b", imageUrl: "https://other" }, s("c")] };

    expect(deckDraftReducer(current, { type: "saved", sent, saved })).toEqual({
      title: "Нова",
      slides: [{ ...mirrored("a"), caption: "Ніч" }, { id: "b", imageUrl: "https://other" }, s("c")],
    });
  });

  it("без дзеркалювання — та сама чернетка", () => {
    const current: DeckDraft = { ...sent, title: "Нова" };

    expect(deckDraftReducer(current, { type: "saved", sent, saved: sent })).toBe(current);
  });
});

describe("puzzle-слайд", () => {
  const spec = { cut: "classic" as const, count: 24, seed: 1, imageWidth: 800, imageHeight: 600 };

  const pz = { ...s("a"), kind: "puzzle" as const, puzzle: spec };

  it("update з puzzle змінює параметри, sameDraft їх помічає", () => {
    const base: DeckDraft = { title: "Т", slides: [pz] };

    const next = deckDraftReducer(base, { type: "update", id: "a", patch: { puzzle: { ...spec, seed: 2 } } });

    expect(next.slides[0].puzzle?.seed).toBe(2);
    expect(next.slides[0].kind).toBe("puzzle");
    expect(sameDraft(base, next)).toBe(false);
    expect(sameDraft(base, { title: "Т", slides: [{ ...pz, puzzle: { ...spec } }] })).toBe(true);
  });

  it("kind розрізняє слайди", () => {
    expect(sameDraft({ title: "Т", slides: [s("a")] }, { title: "Т", slides: [pz] })).toBe(false);
  });
});

