import { describe, expect, it } from "vitest";

import { buildLibrary } from "../../data/library/build";
import type { LibraryUnit } from "../../data/library/types";
import { falloff, raiseOnKill } from "../../data/library/unit-abilities";
import { artifactRows, assertSeedTarget, findByName, findByNames, mapRaceModifiers, parseArgs, racePassiveData, remapRefs, remapSummonUnits, treeInput, unitAvatar, unitRow } from "../seed-library-lib";

import { AbilitySchema } from "@/lib/utils/abilities/schema";
import { getAttackAbilityModifier } from "@/lib/utils/common/calculations";

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

  it("finds a renamed row by a former name, preferring the current name", () => {
    const rows = [{ name: "Поклик звіра", id: "old" }];

    expect(findByNames(rows, "Призив Фенікса", ["Поклик звіра"])?.id).toBe("old");
    expect(findByNames([...rows, { name: "призив фенікса", id: "new" }], "Призив Фенікса", ["Поклик звіра"])?.id).toBe("new");
    expect(findByNames(rows, "Призив Фенікса")).toBeUndefined();
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

  describe("unitRow", () => {
    const maps = { groups: new Map<string, string>(), spells: new Map([["fireball", "sp1"], ["slow", "sp2"]]) };

    const races = new Map([["humans", "r1"]]);

    const base: LibraryUnit = {
      key: "humans-marksman",
      name: "Стрілець",
      raceKey: "humans",
      tier: 2,
      role: "alt",
      hp: 80,
      ac: 12,
      attackBonus: 5,
      initiative: 8,
      attacks: [{ name: "Залп", type: "ranged", dice: "1d8+2", damageType: "piercing", targets: 3 }, { name: "Ніж", type: "melee", dice: "1d4", damageType: "piercing" }],
      abilities: [falloff("Залп")],
      spellKeys: ["fireball", "slow"],
    };

    it("maps stats, attacks, spells and race", () => {
      const row = unitRow(base, maps, races);

      expect(row).toMatchObject({ name: "Стрілець", raceId: "r1", level: 2, armorClass: 12, initiative: 8, speed: 30, maxHp: 80, proficiencyBonus: 2, morale: 1, maxTargets: 3 });
      expect(row.dexterity).toBe(16);
      expect(row.strength).toBe(10);
      expect(row.constitution).toBe(14);
      expect(row.knownSpells).toEqual(["sp1", "sp2"]);
      expect(row.attacks).toEqual([
        { name: "Залп", type: "ranged", attackBonus: 0, damageDice: "1d8+2", damageType: "piercing", maxTargets: 3 },
        { name: "Ніж", type: "melee", attackBonus: 3, damageDice: "1d4", damageType: "piercing", maxTargets: undefined },
      ]);
      expect(row).not.toHaveProperty("avatar");
    });

    it("total to-hit of every attack equals the unit attack bonus", () => {
      const row = unitRow(base, maps, races);

      const scores = { strength: row.strength as number, dexterity: row.dexterity as number };

      for (const a of row.attacks as Array<{ type: string; attackBonus: number }>) {
        expect(a.attackBonus + getAttackAbilityModifier(scores, a.type) + (row.proficiencyBonus as number)).toBe(base.attackBonus);
      }
    });

    it("defaults for a plain neutral unit and adds flavor for flying", () => {
      const row = unitRow({ ...base, raceKey: null, spellKeys: undefined, attacks: [base.attacks[1]], abilities: [], flying: true }, maps, races);

      expect(row).toMatchObject({ raceId: null, knownSpells: [], maxTargets: 1 });
      expect(row.abilities).toEqual([expect.objectContaining({ trigger: { event: "passive" }, effects: [{ kind: "note", text: "Літає" }] })]);
    });

    it("unitAvatar sets the library icon on create and fills only an empty avatar on update", () => {
      const url = "https://x.supabase.co/storage/v1/object/public/unit-icons/humans-marksman.webp";

      expect(unitAvatar(url)).toEqual({ avatar: url });
      expect(unitAvatar(url, null)).toEqual({ avatar: url });
      expect(unitAvatar(url, "")).toEqual({ avatar: url });
      expect(unitAvatar(url, "https://dm.example/custom.png")).toEqual({});
    });

    it("fails on an unknown race", () => {
      expect(() => unitRow({ ...base, raceKey: "elves" }, maps, races)).toThrow(/elves/);
    });
  });

  it("remapSummonUnits swaps library unit keys for database ids in abilities and spell effects", () => {
    const ids = new Map([["necro-skeleton", "u1"]]);

    expect(remapSummonUnits([raiseOnKill("necro-skeleton")], ids)[0].effects).toEqual([{ kind: "summon", unitId: "u1", count: 1 }]);
    expect(remapSummonUnits([{ kind: "summon", group: "Демони", tier: 6 }], ids)).toEqual([{ kind: "summon", group: "Демони", tier: 6 }]);
    expect(() => remapSummonUnits([{ kind: "summon", unitId: "zz" }], ids)).toThrow(/zz/);
  });
});
