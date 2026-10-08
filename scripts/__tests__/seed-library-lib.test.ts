import { describe, expect, it } from "vitest";

import { buildLibrary } from "../../data/library/build";
import { assertSeedTarget, findByName, mapRaceModifiers, parseArgs, remapRefs, treeInput } from "../seed-library-lib";

describe("seed-library-lib", () => {
  it("parses args", () => {
    expect(parseArgs(["c1", "--dry-run", "--replace-trees"])).toEqual({ campaignId: "c1", dryRun: true, allowRemote: false, replaceTrees: true });
    expect(() => parseArgs(["--dry-run"])).toThrow(/campaignId/);
  });

  it("refuses non-local hosts without --allow-remote", () => {
    expect(assertSeedTarget("postgresql://u:p@localhost:54322/db", false)).toBe("localhost");
    expect(() => assertSeedTarget("postgresql://u:p@db.supabase.co:5432/db", false)).toThrow(/db\.supabase\.co/);
    expect(assertSeedTarget("postgresql://u:p@db.supabase.co:5432/db", true)).toBe("db.supabase.co");
    expect(() => assertSeedTarget(undefined, false)).toThrow();
  });

  it("finds rows by name case-insensitively", () => {
    expect(findByName([{ name: "Люди", id: "1" }], "люди")?.id).toBe("1");
    expect(findByName([{ name: "Люди" }], "Ельфи")).toBeUndefined();
  });

  it("remaps school and spell references everywhere", () => {
    const maps = { groups: new Map([["Світло", "g1"]]), spells: new Map([["a", "s1"]]) };

    const input = [{ trigger: { school: "Світло", spellIds: ["a"] }, effects: [{ filter: { school: "Світло" } }] }];

    expect(remapRefs(input, maps)).toEqual([{ trigger: { school: "g1", spellIds: ["s1"] }, effects: [{ filter: { school: "g1" } }] }]);
    expect(() => remapRefs({ spellIds: ["zz"] }, maps)).toThrow(/zz/);
  });

  it("maps race modifiers to ids", () => {
    expect(mapRaceModifiers([{ raceKey: "humans", percent: 10 }], new Map([["humans", "r1"]]))).toEqual([{ raceId: "r1", percent: 10 }]);
  });

  it("builds a tree per race with every skill once", () => {
    const lib = buildLibrary();

    const skills = new Map(lib.skills.map((s) => [s.key, `id-${s.key}`]));

    const mainSkills = new Map(lib.branches.map((b) => [b.key, `m-${b.key}`]));

    const groups = new Map(lib.schools.map((s) => [s, `g-${s}`]));

    for (const race of lib.races) {
      const input = treeInput(race, lib.branches, { skills, mainSkills, groups, branchIcon: () => undefined });

      const ids = [
        ...input.branches.flatMap((b) => [...Object.values(b.levels ?? {}), ...(b.outer ?? []), ...(b.middle ?? []), ...(b.inner ?? [])]),
        ...Object.values(input.racial ?? {}),
        input.ultimate,
      ];

      expect(input.branches.map((b) => b.name)).toEqual(race.branchKeys.map((k) => lib.branches.find((b) => b.key === k)?.name));
      expect(new Set(ids).size).toBe(ids.length);
      expect(input.race).toBe(race.name);
    }
  });

  it("leaves no school name or spell key where an id is expected", () => {
    const lib = buildLibrary();

    const maps = { groups: new Map(lib.schools.map((s) => [s, `gid:${s}`])), spells: new Map(lib.spells.map((s) => [s.key, `sid:${s.key}`])) };

    const bad: string[] = [];

    const walk = (value: unknown, where: string) => {
      if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${where}[${i}]`));

      if (typeof value !== "object" || value === null) return;

      for (const [k, v] of Object.entries(value)) {
        if (k === "school" && !String(v).startsWith("gid:")) bad.push(`${where}.school=${String(v)}`);

        if (k === "spellIds") for (const id of v as string[]) if (!id.startsWith("sid:")) bad.push(`${where}.spellIds=${id}`);

        walk(v, `${where}.${k}`);
      }
    };

    for (const skill of lib.skills) walk(remapRefs(skill.abilities, maps), skill.key);

    expect(bad).toEqual([]);
  });
});
