import { describe, expect, it } from "vitest";

import { buildLibrary } from "../../data/library/build";
import { artifactRows, assertSeedTarget, findByName, mapRaceModifiers, parseArgs, racePassiveData, remapRefs, treeInput } from "../seed-library-lib";

import { AbilitySchema } from "@/lib/utils/abilities/schema";

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

  it("builds race passive data: display modifiers match applying stat abilities", () => {
    for (const race of buildLibrary().races) {
      const { passiveAbility, abilities } = racePassiveData(race);

      expect(passiveAbility.description).toBe(race.passive.description);
      expect(passiveAbility.name).toBe(race.passive.name);
      expect(abilities.every((a) => AbilitySchema.safeParse(a).success)).toBe(true);

      const applied = abilities.flatMap((a) => a.effects).flatMap((e) => (e.kind === "modifyStat" && typeof e.flat === "number" ? [[e.stat, e.flat] as const] : []));

      for (const [stat, flat] of Object.entries(race.passive.stats)) expect(applied).toContainEqual([stat, flat]);

      expect(Object.keys(passiveAbility.statModifiers).sort()).toEqual(Object.keys(race.passive.stats).sort());
      expect(racePassiveData(race)).toEqual(racePassiveData(race));
    }
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
  it("artifactRows remaps spell keys and schools and joins lore", () => {
    const maps = { spells: new Map([["blindness", "sp1"], ["slow", "sp2"]]), groups: new Map([["Світло", "g1"]]) } as never;

    const set = {
      key: "s", name: "Сет", description: "Механіка сету.", appearanceDescription: "Лор сету.", iconKey: "sar-issus", heroName: "Зехір",
      abilities: [{ id: "a", name: "a", trigger: { event: "spellCast", phase: "after", role: "caster", school: "Світло" }, effects: [{ kind: "heal", amount: 1, target: "allAllies" }] }],
      artifacts: [{ key: "h", name: "Шолом", description: "Механіка.", appearanceDescription: "Лор.", iconKey: "helm-of-the-dwarven-kings", slot: "helmet", rarity: "epic",
        abilities: [{ id: "b", name: "b", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellImmunity", spellIds: ["blindness", "slow"], target: "allAllies" }] }] }],
    } as never;

    const rows = artifactRows(set, maps, (k) => (k ? `url/${k}` : undefined));

    expect(rows.set.description).toBe("Механіка сету.\n\nЛор сету.");
    expect(rows.set.abilities[0].trigger).toMatchObject({ school: "g1" });
    expect(rows.artifacts[0]).toMatchObject({ name: "Шолом", slot: "helmet", icon: "url/helm-of-the-dwarven-kings" });
    expect(artifactRows({ ...(set as object), artifacts: [{ ...(set as { artifacts: object[] }).artifacts[0], slot: "cape" }] } as never, maps, () => undefined).artifacts[0].slot).toBe("cloak");
    expect(rows.artifacts[0].abilities[0].effects[0]).toMatchObject({ spellIds: ["sp1", "sp2"] });
  });
});
