import { describe, expect, it } from "vitest";

import { BRANCHES } from "../branches";
import { buildLibrary, LIBRARY_COMPLETE, LIBRARY_SOURCE, MIN_APPEARANCE_LENGTH, racePassiveAbilities, racePassiveStatModifiers, raceSkills } from "../build";
import { PERSONAL } from "../personal";
import { RACES } from "../races";
import { SPELLS } from "../spells";
import type { LibraryBranch, LibraryRace, LibrarySkill, LibrarySource, LibrarySpell } from "../types";

import { BRANCH_ICONS, SKILL_ICONS, SPELL_ICONS } from "@/data/skill-icons";

const APPEARANCE = "Світло розгортається над полем бою золотим куполом, і навіть найстаміший воїн відчуває, як повертаються сили.";

function skill(key: string, over: Partial<LibrarySkill> = {}): LibrarySkill {
  return {
    key,
    name: `Скіл ${key}`,
    description: "Дає +1 до сили.",
    appearanceDescription: APPEARANCE,
    abilities: [{ id: key, name: key, trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "strength", flat: 1 }] }],
    ...over,
  };
}

function spell(key: string, over: Partial<LibrarySpell> = {}): LibrarySpell {
  return {
    key,
    iconKey: "haste",
    name: `Заклинання ${key}`,
    description: "Завдає шкоди.",
    appearanceDescription: APPEARANCE,
    school: "Світло",
    level: 1,
    definition: { dice: 1, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, effects: [] },
    raceModifiers: [],
    ...over,
  };
}

function race(key: string): LibraryRace {
  return {
    key,
    name: `Раса ${key}`,
    description: "Опис раси.",
    appearanceDescription: APPEARANCE,
    passive: {
      iconKey: "race-flag-humans",
      name: "Пасивка",
      description: "+1 до Сили.",
      appearanceDescription: APPEARANCE,
      stats: { strength: 1 },
      trait: [{ id: `${key}-trait`, name: "Риса", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "noNegativeMorale" }] }],
    },
    branchKeys: ["b"],
    spellSlotProgression: [],
    levels: [skill(`${key}-1`), skill(`${key}-2`), skill(`${key}-3`)],
    ultimate: skill(`${key}-u`),
  };
}

function branch(key: string, over: Partial<LibraryBranch> = {}): LibraryBranch {
  return {
    key,
    name: `Гілка ${key}`,
    description: "Опис гілки.",
    appearanceDescription: APPEARANCE,
    color: "#ffffff",
    levels: [skill(`${key}-l1`)],
    slots: [[skill(`${key}-s1`)]],
    spares: [],
    ...over,
  };
}

function source(over: Partial<LibrarySource> = {}): LibrarySource {
  return { spells: [], branches: [], races: [], personal: [], ...over };
}

describe("buildLibrary validation", () => {
  it("rejects races with invalid or empty passives", () => {
    const base = race("r");

    const withPassive = (over: Partial<LibraryRace["passive"]>) => source({ branches: [branch("b")], races: [{ ...base, passive: { ...base.passive, ...over } }] });

    expect(() => buildLibrary(withPassive({ description: " " }))).toThrow(/порожнє passive.description/);
    expect(() => buildLibrary(withPassive({ appearanceDescription: "коротко" }))).toThrow(/пасивки коротший/);
    expect(() => buildLibrary(withPassive({ trait: [] }))).toThrow(/порожній passive.trait/);
    expect(() => buildLibrary(withPassive({ trait: [{ id: "x", name: "x", trigger: { event: "passive" }, effects: [{ kind: "heal", amount: { flat: 1 } } as never] }] }))).toThrow(/пасивка/);
  });

  it("accepts a valid source", () => {
    const lib = buildLibrary(source({ spells: [spell("s")], branches: [branch("b", { spellSchool: "Світло" })], races: [race("r")] }));

    expect(lib.schools).toEqual(["Світло"]);
    expect(lib.skills).toHaveLength(6);

    expect(() => buildLibrary(source({ branches: [branch("b")], races: [{ ...race("r"), branchKeys: ["x"] }] }))).toThrow(/невідома гілка «x»/);
    expect(() => buildLibrary(source({ branches: [branch("b")], races: [{ ...race("r"), branchKeys: [] }] }))).toThrow(/порожній список/);
    expect(lib.spellByKey.has("s")).toBe(true);
  });

  it("reports duplicate keys and names", () => {
    expect(() => buildLibrary(source({ spells: [spell("s"), spell("s")] }))).toThrow(/дублікат key «s»/);
    expect(() => buildLibrary(source({ spells: [spell("a", { name: "Х" }), spell("b", { name: "Х" })] }))).toThrow(/дублікат name «Х»/);
    expect(() => buildLibrary(source({ personal: [skill("p"), skill("p")] }))).toThrow(/Скіли: дублікат key/);
  });

  it("rejects invalid ability JSON", () => {
    const bad = skill("bad", { abilities: [{ id: "x", name: "x", trigger: { event: "passive" }, effects: [] }] });

    expect(() => buildLibrary(source({ personal: [bad] }))).toThrow(/Скіл «bad»/);
  });

  it("rejects invalid spell definitions", () => {
    const bad = spell("bad");

    bad.definition.dice = 99;

    expect(() => buildLibrary(source({ spells: [bad] }))).toThrow(/Заклинання «bad»/);
  });

  it("rejects unknown icon keys", () => {
    expect(() => buildLibrary(source({ personal: [skill("p", { iconKey: "nope" })] }))).toThrow(/невідомий iconKey/);
    expect(() => buildLibrary(source({ personal: [skill("p", { iconKey: "brutality" })] }))).not.toThrow();
  });

  it("requires known spell icons", () => {
    expect(() => buildLibrary(source({ spells: [spell("s", { iconKey: undefined })] }))).toThrow(/немає iconKey/);
    expect(() => buildLibrary(source({ spells: [spell("s", { iconKey: "brutality" })] }))).toThrow(/невідомий iconKey/);
  });

  it("rejects short or empty descriptions", () => {
    expect(() => buildLibrary(source({ personal: [skill("p", { appearanceDescription: "Коротко." })] }))).toThrow(/коротший/);
    expect(() => buildLibrary(source({ personal: [skill("p", { description: " " })] }))).toThrow(/порожній опис/);
  });

  it("resolves spell references", () => {
    const flag = {
      id: "t",
      name: "t",
      trigger: { event: "passive" as const },
      effects: [{ kind: "flag" as const, flag: "spellTargeting" as const, mode: "area" as const, spellIds: ["missing"] }],
    };

    expect(() => buildLibrary(source({ personal: [skill("p", { abilities: [flag] })] }))).toThrow(/заклинання «missing» не знайдено/);

    const trigger = { id: "t", name: "t", trigger: { event: "spellCast" as const, phase: "after" as const, role: "caster" as const, spellIds: ["missing"], school: "Нема" }, effects: [{ kind: "note" as const, text: "x" }] };

    expect(() => buildLibrary(source({ personal: [skill("p", { abilities: [trigger] })] }))).toThrow(/заклинання «missing» не знайдено/);
    expect(() => buildLibrary(source({ personal: [skill("p", { abilities: [trigger] })] }))).toThrow(/невідома школа «Нема»/);
    expect(() => buildLibrary(source({ personal: [skill("p", { newSpellKey: "missing" })] }))).toThrow(/newSpellKey/);
    expect(() => buildLibrary(source({ personal: [skill("p", { grantedSpellKey: "s" })], spells: [spell("s")] }))).not.toThrow();
    expect(() => buildLibrary(source({ spells: [spell("s", { raceModifiers: [{ raceKey: "none", percent: 10 }] })] }))).toThrow(/невідома раса/);
    expect(() => buildLibrary(source({ branches: [branch("b", { spellSchool: "Хаос" })] }))).toThrow(/невідома школа/);
  });
});

describe("library content", () => {
  it("builds without issues", () => {
    expect(() => buildLibrary(LIBRARY_SOURCE)).not.toThrow();
  });

  const content = it.skipIf(!LIBRARY_COMPLETE);

  content("has 8 branches with 3 levels and 3/2/1 slots", () => {
    expect(BRANCHES).toHaveLength(8);

    for (const b of BRANCHES) {
      expect(b.levels, b.key).toHaveLength(3);
      expect(b.slots.map((s) => s.length), b.key).toEqual([3, 2, 1]);
    }
  });

  content("gives every race a passive with stat bonuses and one trait", () => {
    const expected: Record<string, Record<string, number>> = {
      humans: { strength: 2, charisma: 1 },
      demons: { strength: 2, charisma: 1 },
      elves: { dexterity: 2, wisdom: 1 },
      necromancers: { intelligence: 2, constitution: 1 },
      mages: { intelligence: 2, wisdom: 1 },
      "dark-elves": { dexterity: 2, charisma: 1 },
      dwarves: { constitution: 2, strength: 1 },
    };

    for (const r of RACES) {
      expect(r.passive.stats, r.key).toEqual(expected[r.key]);
      expect(r.passive.trait, r.key).toHaveLength(1);
      expect(racePassiveAbilities(r)[0].id, r.key).toBe(`${r.key}-stats`);
      expect(Object.keys(racePassiveStatModifiers(r)), r.key).toEqual(Object.keys(expected[r.key]));
    }
  });

  content("has 7 races with 4 skills each", () => {
    expect(RACES).toHaveLength(7);

    for (const r of RACES) expect(raceSkills(r), r.key).toHaveLength(4);
  });

  content("race trees use the agreed branch sets", () => {
    const keys = Object.fromEntries(RACES.map((r) => [r.key, r.branchKeys]));

    expect(keys).toEqual({
      humans: ["leadership", "ranged", "attack", "defense", "light"],
      necromancers: ["ranged", "attack", "defense", "dark"],
      demons: ["attack", "defense", "ranged", "dark", "leadership", "chaos"],
      elves: ["leadership", "ranged", "attack", "defense", "nature"],
      dwarves: ["leadership", "ranged", "attack", "defense", "light"],
      mages: ["light", "dark", "chaos", "nature", "defense", "leadership"],
      "dark-elves": ["attack", "defense", "ranged", "dark", "chaos"],
    });
  });

  content("has 10 personal abilities", () => {
    expect(PERSONAL).toHaveLength(10);
  });

  content("has spells in 4 schools", () => {
    expect(buildLibrary().schools).toHaveLength(4);
    expect(SPELLS.length).toBeGreaterThanOrEqual(48);
  });

  content("has icons that exist and long appearance texts", () => {
    const lib = buildLibrary();

    const icons = new Set([...Object.keys(SKILL_ICONS), ...Object.keys(BRANCH_ICONS)]);

    const entries = [...lib.spells, ...lib.branches, ...lib.races, ...lib.skills];

    for (const e of entries) {
      expect(e.description.trim(), e.key).not.toBe("");
      expect(e.appearanceDescription.length, e.key).toBeGreaterThanOrEqual(MIN_APPEARANCE_LENGTH);

      if (e.iconKey) expect((SPELLS.includes(e as never) ? Object.keys(SPELL_ICONS) : [...icons]).includes(e.iconKey), e.key).toBe(true);
    }
  });

  content("branch levels are absolute: the highest level replaces lower ones", () => {
    const value = (b: string, i: number) => {
      const effect = BRANCHES.find((x) => x.key === b)?.levels[i].abilities[0].effects[0] as { percent?: number; flat?: number };

      return effect.percent ?? effect.flat;
    };

    for (const b of ["attack", "ranged", "defense"]) expect([0, 1, 2].map((i) => value(b, i))).toEqual([10, 20, 30]);

    expect([0, 1, 2].map((i) => value("leadership", i))).toEqual([1, 2, 3]);

    for (const e of [...BRANCHES, ...RACES]) expect(`${e.description} ${[...e.levels].map((l) => l.description).join(" ")}`, e.key).not.toMatch(/разом із|ще \+/);
  });
});
