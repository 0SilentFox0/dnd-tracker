// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const libs = vi.hoisted(() => ({
  backgrounds: { data: [] as unknown[] },
  races: { data: [] as unknown[] },
  classes: { data: [] as unknown[] },
  feats: { data: [] as unknown[] },
  refs: { data: undefined as unknown },
  useSpellRefs: vi.fn(),
}));

vi.mock("@/lib/hooks/backgrounds", () => ({ useBackgrounds: () => libs.backgrounds }));
vi.mock("@/lib/hooks/races", () => ({ useRaces: () => libs.races }));
vi.mock("@/lib/hooks/classes", () => ({ useClasses: () => libs.classes }));
vi.mock("@/lib/hooks/feats", () => ({ useFeats: () => libs.feats }));
vi.mock("@/lib/hooks/spells", () => ({ useSpellRefs: (...args: unknown[]) => { libs.useSpellRefs(...args);

  return libs.refs; } }));

import { useChoiceRefs } from "@/lib/hooks/characters/useChoiceRefs";

const spellChoice = { id: "c", label: "Spell", level: 1, count: 1, kind: "spell", spells: { lists: ["wizard"], minLevel: 0, maxLevel: 1 } };

const skillChoice = { ...spellChoice, kind: "skill" };

const enabledFlag = () => libs.useSpellRefs.mock.lastCall?.[1].enabled;

describe("useChoiceRefs spell refs", () => {
  beforeEach(() => {
    libs.useSpellRefs.mockClear();
    libs.backgrounds.data = [];
    libs.races.data = [];
    libs.classes.data = [];
    libs.feats.data = [];
    libs.refs.data = undefined;
  });

  it("без вибору заклять refs не запитуються, а список готовий", () => {
    libs.feats.data = [{ id: "f", choices: [skillChoice] }];

    const { result } = renderHook(() => useChoiceRefs("c1", "Elf"));

    expect(enabledFlag()).toBe(false);
    expect(result.current.ready).toBe(true);
    expect(result.current.spells).toEqual([]);
  });

  it.each([
    ["фіча", () => { libs.feats.data = [{ id: "f", choices: [spellChoice] }]; }],
    ["підклас", () => { libs.classes.data = [{ id: "k", features: [], subclasses: [{ id: "s", name: "S", features: [{ level: 3, abilities: [], choices: [spellChoice] }] }] }]; }],
    ["раса", () => { libs.races.data = [{ id: "r", name: "Elf", choices: [spellChoice] }]; }],
  ])("вибір закляття (%s) вмикає refs, ready чекає на них", (_name, setup) => {
    setup();

    const { result, rerender } = renderHook(() => useChoiceRefs("c1", "Elf"));

    expect(enabledFlag()).toBe(true);
    expect(result.current.ready).toBe(false);

    libs.refs.data = [{ id: "s1", name: "Bolt", level: 1, lists: ["wizard"] }];
    rerender();
    expect(result.current.ready).toBe(true);
    expect(result.current.spellsById.s1.name).toBe("Bolt");
  });

  it("opts.enabled=false вимикає refs", () => {
    libs.feats.data = [{ id: "f", choices: [spellChoice] }];
    renderHook(() => useChoiceRefs("c1", "Elf", { enabled: false }));
    expect(enabledFlag()).toBe(false);
  });
});
