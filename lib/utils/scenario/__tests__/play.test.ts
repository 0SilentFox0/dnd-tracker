import { describe, expect, it } from "vitest";

import { battleAction, boundDeckIds, currentSlideRow, hasPlayBindings, markerOnScreen, nextSlideRow, type PlayLookup, rowBattleState, rowSlideState } from "../play";

import type { RichDoc, ScenarioContent, ScenarioRow } from "@/types/scenario";
import type { ShowState, Slide } from "@/types/show";

const doc: RichDoc = { type: "doc", content: [] };

const row = (over: Partial<ScenarioRow> = {}): ScenarioRow => ({ id: "r1", story: doc, notes: doc, ...over });

const slide = (id: string): Slide => ({ id, imageUrl: `https://x/${id}.webp` });

const show = (over: Partial<ShowState> = {}): ShowState => ({ deckId: "d1", deckTitle: "Ліс", slide: slide("slide-a"), nextImageUrl: null, audio: null, seq: 1, ...over });

const lookup = (over: Partial<PlayLookup> = {}): PlayLookup => ({
  decks: new Map([["d1", [slide("slide-a"), slide("slide-b")]], ["gone", null]]),
  battles: new Map([["b1", { id: "b1", name: "Засідка", status: "prepared" }], ["b2", { id: "b2", name: "Вовки", status: "active" }], ["b3", { id: "b3", name: "Старий", status: "completed" }]]),
  show: show(),
  ...over,
});

describe("rowSlideState", () => {
  it("без прив'язки — none", () => expect(rowSlideState(row(), lookup())).toEqual({ kind: "none" }));

  it("поточний слайд показу — active", () => {
    expect(rowSlideState(row({ slide: { deckId: "d1", slideId: "slide-a" } }), lookup())).toEqual({ kind: "ready", slide: slide("slide-a"), current: true, active: true });
    expect(rowSlideState(row({ slide: { deckId: "d1", slideId: "slide-b" } }), lookup())).toMatchObject({ kind: "ready", active: false });
  });

  it("набір ще вантажиться — loading", () => expect(rowSlideState(row({ slide: { deckId: "d9", slideId: "x" } }), lookup())).toEqual({ kind: "loading" }));

  it("набору або слайда немає — missing", () => {
    expect(rowSlideState(row({ slide: { deckId: "gone", slideId: "x" } }), lookup())).toEqual({ kind: "missing" });
    expect(rowSlideState(row({ slide: { deckId: "d1", slideId: "slide-zzz" } }), lookup())).toEqual({ kind: "missing" });
  });
});

describe("rowBattleState / battleAction", () => {
  it("список не завантажено — loading; бою немає — missing", () => {
    expect(rowBattleState(row({ battleId: "b1" }), lookup({ battles: null }))).toEqual({ kind: "loading" });
    expect(rowBattleState(row({ battleId: "nope" }), lookup())).toEqual({ kind: "missing" });
  });

  it("called — коли показ уже кличе саме цей бій", () => {
    expect(rowBattleState(row({ battleId: "b2" }), lookup({ show: show({ battle: { id: "b2", name: "Вовки" } }) }))).toMatchObject({ kind: "ready", called: true });
    expect(rowBattleState(row({ battleId: "b2" }), lookup())).toMatchObject({ kind: "ready", called: false });
  });

  it("prepared → start, active → call, completed/missing → none", () => {
    expect(battleAction(rowBattleState(row({ battleId: "b1" }), lookup()))).toBe("start");
    expect(battleAction(rowBattleState(row({ battleId: "b2" }), lookup()))).toBe("call");
    expect(battleAction(rowBattleState(row({ battleId: "b3" }), lookup()))).toBe("none");
    expect(battleAction(rowBattleState(row({ battleId: "nope" }), lookup()))).toBe("none");
  });
});

describe("boundDeckIds", () => {
  it("унікальні набори з усіх рядків", () => {
    const content: ScenarioContent = { legend: [], sections: [{ id: "s", title: "", played: false, rows: [row({ slide: { deckId: "d1", slideId: "a" } }), row({ id: "r2", slide: { deckId: "d1", slideId: "b" } }), row({ id: "r3", slide: { deckId: "d2", slideId: "c" } }), row({ id: "r4" })] }] };

    expect(boundDeckIds(content)).toEqual(["d1", "d2"]);
  });
});

describe("currentSlideRow / nextSlideRow", () => {
  const content = (rows: ScenarioRow[][]): ScenarioContent => ({ legend: [], sections: rows.map((r, i) => ({ id: `s${i}`, title: `Розділ ${i}`, rows: r })) }) as unknown as ScenarioContent;

  const a = row({ id: "ra", slide: { deckId: "d1", slideId: "slide-a" } });

  const b = row({ id: "rb", slide: { deckId: "d1", slideId: "slide-b" } });

  const gone = row({ id: "rg", slide: { deckId: "gone", slideId: "x" } });

  it("поточний рядок — той, чий слайд на екрані", () => {
    expect(currentSlideRow(content([[row(), a], [b]]), lookup())?.id).toBe("ra");
    expect(currentSlideRow(content([[b]]), lookup())).toBeNull();
  });

  it("наступний — через розділи, пропускаючи недоступні", () => {
    expect(nextSlideRow(content([[a, gone], [row(), b]]), lookup())?.id).toBe("rb");
  });

  it("без поточного — перший доступний; після останнього — null", () => {
    expect(nextSlideRow(content([[gone, b, a]]), lookup({ show: null }))?.id).toBe("rb");
    expect(nextSlideRow(content([[b, a]]), lookup())).toBeNull();
  });

  it("під заглушкою поточний рядок не active, і nextSlideRow повертає його", () => {
    const covered = lookup({ show: show({ curtain: true }) });

    expect(rowSlideState(a, covered)).toMatchObject({ current: true, active: false });
    expect(nextSlideRow(content([[a, b]]), covered)?.id).toBe("ra");
  });
});

describe("marker bindings", () => {
  const ref = { mapId: "w", markerId: "m" };

  it("hasPlayBindings: маркер лише в главі теж прив'язка", () => {
    const content = (section: object): ScenarioContent => ({ legend: [], sections: [{ id: "s", title: "S", played: false, rows: [row()], ...section }] });

    expect(hasPlayBindings(content({}))).toBe(false);
    expect(hasPlayBindings(content({ marker: ref }))).toBe(true);
    expect(hasPlayBindings(content({ rows: [row({ marker: ref })] }))).toBe(true);
  });

  it("markerOnScreen: збігається карта й маркер, заглушка гасить", () => {
    expect(markerOnScreen(ref, show({ world: { mapId: "w", focusMarkerId: "m" } }))).toBe(true);
    expect(markerOnScreen(ref, show({ world: { mapId: "w", focusMarkerId: "other" } }))).toBe(false);
    expect(markerOnScreen(ref, show({ world: { mapId: "w", focusMarkerId: "m" }, curtain: true }))).toBe(false);
    expect(markerOnScreen(ref, null)).toBe(false);
  });
});
