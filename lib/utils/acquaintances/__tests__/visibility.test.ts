import { describe, expect, it } from "vitest";

import { type AcquaintanceRecord, isAcquaintanceRevealed, revealedAcquaintanceIds, viewAcquaintances } from "@/lib/utils/acquaintances/visibility";
import { playedLookup } from "@/lib/utils/scenario/reveal";

const played = playedLookup([
  { id: "p1", played: ["s1"] },
  { id: "p2", played: ["t1"] },
]);

const record = (over: Partial<AcquaintanceRecord> = {}): AcquaintanceRecord => ({
  id: "a1",
  campaignId: "c1",
  kind: "micro",
  characterId: null,
  name: "Ярема",
  avatarUrl: null,
  description: "Коваль",
  sourcePageId: "p1",
  sourceSectionId: "s1",
  character: null,
  entries: [],
  notes: [],
  ...over,
});

const entry = (id: string, pageId: string, sectionId: string, sortOrder = 0, at = 0) => ({ id, pageId, sectionId, text: id, sortOrder, createdAt: new Date(at) });

const note = (id: string, authorUserId: string, displayName: string) => ({ id, authorUserId, text: id, updatedAt: new Date(0), author: { displayName } });

const player = { userId: "u1", isDM: false };

const dm = { userId: "dm", isDM: true };

describe("isAcquaintanceRevealed", () => {
  it("is true for a played source section and false for unknown ones", () => {
    expect(isAcquaintanceRevealed({ sourcePageId: "p1", sourceSectionId: "s1" }, played)).toBe(true);
    expect(isAcquaintanceRevealed({ sourcePageId: "p1", sourceSectionId: "zz" }, played)).toBe(false);
    expect(isAcquaintanceRevealed({ sourcePageId: "gone", sourceSectionId: "s1" }, played)).toBe(false);
  });
});

describe("viewAcquaintances for a player", () => {
  it("hides acquaintances whose section is not played and shows played ones as visible", () => {
    const rows = [record({ id: "a1" }), record({ id: "a2", sourceSectionId: "s2" })];

    expect(viewAcquaintances(rows, player, played).map((a) => [a.id, a.hidden])).toEqual([["a1", false]]);
  });

  it("keeps only journal entries of played sections, ordered by sortOrder then createdAt", () => {
    const entries = [entry("e3", "p2", "t1", 1), entry("e1", "p1", "s1", 0, 5), entry("e0", "p1", "s1", 0, 1), entry("hidden", "p1", "s9", 0)];

    const [view] = viewAcquaintances([record({ entries })], player, played);

    expect(view.entries.map((e) => e.id)).toEqual(["e0", "e1", "e3"]);
    expect(view.entries.every((e) => !e.hidden)).toBe(true);
  });

  it("returns only the viewer's own notes", () => {
    const [view] = viewAcquaintances([record({ notes: [note("n1", "u1", "Я"), note("n2", "u2", "Інший")] })], player, played);

    expect(view.notes.map((n) => [n.id, n.own])).toEqual([["n1", true]]);
  });

  it("does not reveal an acquaintance of an unknown section or page", () => {
    expect(viewAcquaintances([record({ sourcePageId: "gone" })], player, played)).toEqual([]);
  });
});

describe("viewAcquaintances for the DM", () => {
  it("returns everything, marking unplayed acquaintances and entries as hidden", () => {
    const rows = [record({ id: "a1", entries: [entry("e1", "p1", "s1"), entry("e2", "p1", "s9", 1)] }), record({ id: "a2", sourcePageId: "gone" })];

    const views = viewAcquaintances(rows, dm, played);

    expect(views.map((a) => [a.id, a.hidden])).toEqual([["a1", false], ["a2", true]]);
    expect(views[0].entries.map((e) => [e.id, e.hidden])).toEqual([["e1", false], ["e2", true]]);
  });

  it("returns all notes with author names and own flag by userId", () => {
    const [view] = viewAcquaintances([record({ notes: [note("n1", "u1", "Аня"), note("n2", "dm", "ДМ")] })], dm, played);

    expect(view.notes.map((n) => [n.authorName, n.own])).toEqual([["Аня", false], ["ДМ", true]]);
  });
});

describe("viewAcquaintances projection", () => {
  it("takes name and avatar from the character for kind character", () => {
    const [view] = viewAcquaintances([record({ kind: "character", characterId: "ch1", character: { name: "Король", avatar: "https://x/k.png" } })], player, played);

    expect(view).toMatchObject({ name: "Король", avatarUrl: "https://x/k.png", characterId: "ch1" });
  });

  it("takes the description from the character biography for kind character, else keeps its own", () => {
    const withBio = record({ kind: "character", characterId: "ch1", description: "старе", character: { name: "Король", avatar: null, background: " Колишній воїн " } });

    const noBio = record({ kind: "character", characterId: "ch1", description: "своє", character: { name: "Король", avatar: null, background: null } });

    expect(viewAcquaintances([withBio], player, played)[0].description).toBe("Колишній воїн");
    expect(viewAcquaintances([noBio], player, played)[0].description).toBe("своє");
  });

  it("falls back to own name and avatar when the character is gone", () => {
    const [view] = viewAcquaintances([record({ kind: "character", characterId: null, avatarUrl: "https://x/a.png" })], player, played);

    expect(view).toMatchObject({ name: "Ярема", avatarUrl: "https://x/a.png" });
  });

  it("sorts cards by name in Ukrainian collation", () => {
    const rows = [record({ id: "b", name: "Іван" }), record({ id: "a", name: "Андрій" }), record({ id: "c", name: "Ґедзь" })];

    expect(viewAcquaintances(rows, player, played).map((a) => a.id)).toEqual(["a", "c", "b"]);
  });
});

describe("revealedAcquaintanceIds", () => {
  it("returns ids whose source section is played", () => {
    const rows = [
      { id: "a1", sourcePageId: "p1", sourceSectionId: "s1" },
      { id: "a2", sourcePageId: "p1", sourceSectionId: "s2" },
    ];

    expect(revealedAcquaintanceIds(rows, played)).toEqual(["a1"]);
  });
});
