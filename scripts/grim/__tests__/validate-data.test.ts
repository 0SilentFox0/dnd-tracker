import * as path from "path";
import { describe, expect, it } from "vitest";

import { type GrimData, readGrimData } from "../data";
import { careerSkillIssue, validateGrimData } from "../validate-data";

const fixtures = path.join(__dirname, "fixtures");

const load = (): GrimData => structuredClone(readGrimData(fixtures));

const issuesOf = (data: GrimData) => {
  const result = validateGrimData(data);

  return result.ok ? [] : result.issues;
};

describe("readGrimData", () => {
  it("reads present files and treats missing ones as empty", () => {
    const data = load();

    expect(data.races).toHaveLength(1);
    expect(data.careers).toHaveLength(2);
    expect(data.feats).toHaveLength(2);
    expect(data.units).toHaveLength(1);
    expect(data.spells).toHaveLength(1);
    expect(data.artifacts).toEqual([]);
    expect(data.raceProfiles).toHaveLength(1);
  });
});

describe("validateGrimData", () => {
  it("accepts the good fixture", () => {
    expect(validateGrimData(load())).toEqual({ ok: true });
  });

  it("rejects a duplicate career name", () => {
    const data = load();

    data.careers[1].name = "vermin hunter";
    expect(issuesOf(data).some((i) => i.includes("careers #2") && i.includes("duplicate name"))).toBe(true);
  });

  it("rejects a tier talent that is not a feat", () => {
    const data = load();

    data.careers[0].tier2_talents = ["Missing Talent"];
    expect(issuesOf(data)).toContain('careers #1 "Vermin Hunter": unknown tier2_talents "Missing Talent"');
  });

  it("requires links to match the catalog name exactly", () => {
    const data = load();

    const talent = String(data.feats[0].name);

    data.careers[0].tier2_talents = [talent.toLowerCase()];
    data.raceProfiles[0].profile.talents = [talent.toUpperCase()];

    const issues = issuesOf(data);

    expect(issues).toContain(`careers #1 "Vermin Hunter": unknown tier2_talents "${talent.toLowerCase()}"`);
    expect(issues.some((i) => i.includes(`unknown feat "${talent.toUpperCase()}"`))).toBe(true);
  });

  it("rejects a unit linking to a spell or race that is not in the data", () => {
    const data = load();

    data.units[0].knownSpells = ["Ghost Bolt"];
    data.units[0].raceId = "Nobody";

    const issues = issuesOf(data);

    expect(issues).toContain('units #1 "Giant Rat": unknown knownSpells "Ghost Bolt"');
    expect(issues).toContain('units #1 "Giant Rat": unknown raceId "Nobody"');
  });

  it("rejects a nested spell link in a unit that is not in the data", () => {
    const data = load();

    data.units[0].abilities = [{ name: "Cast", description: "x", spellId: "Ghost Bolt" }];
    expect(issuesOf(data).some((i) => i.startsWith("units #1") && i.includes('"Ghost Bolt"'))).toBe(true);
  });

  it("rejects a profile pointing at an unknown race, career or talent", () => {
    const data = load();

    data.raceProfiles[0] = { race: "Nobody", profile: { ...data.raceProfiles[0].profile, talents: ["Nope"], careerTable: [{ max: 100, careerId: "Ghost" }] } };

    const issues = issuesOf(data);

    expect(issues.some((i) => i.includes("unknown race"))).toBe(true);
    expect(issues.some((i) => i.includes('unknown feat "Nope"'))).toBe(true);
    expect(issues.some((i) => i.includes('unknown career "Ghost"'))).toBe(true);
  });

  it("rejects a profile that breaks its own schema", () => {
    const data = load();

    data.raceProfiles[0].profile = { ...data.raceProfiles[0].profile, careerTable: [{ max: 50, careerId: "Vermin Hunter" }] };
    expect(issuesOf(data).some((i) => i.includes("race-profiles #1") && i.includes("creation.tableEnd"))).toBe(true);
  });

  it("names the row that fails the resource schema or has an unknown column", () => {
    const data = load();

    data.units[0].maxHp = -5;
    data.feats[1].bogusColumn = 1;

    const issues = issuesOf(data);

    expect(issues.some((i) => i.startsWith('units #1 "Giant Rat"'))).toBe(true);
    expect(issues.some((i) => i.startsWith('feats #2 "Sharp Eyed"') && i.includes("bogusColumn"))).toBe(true);
  });

  it("rejects a row without a name", () => {
    const data = load();

    delete data.races[0].name;
    expect(issuesOf(data).some((i) => i.startsWith("races #1") && i.includes("name is required"))).toBe(true);
  });

  it("rejects an invalid rules patch", () => {
    const data = load();

    data.rules = { morale: { enabled: "yes" } } as never;
    expect(issuesOf(data).some((i) => i.startsWith("rules:"))).toBe(true);
  });

  it.each([
    ["melee", "needs a specialisation"],
    ["perception:x", "takes no specialisation"],
    ["melee:spear", "unknown specialisation"],
    ["sailing", "unknown skill"],
  ])("rejects career skill %s", (skill, reason) => {
    const data = load();

    data.careers[0].tier1_skills = [skill];
    expect(issuesOf(data)).toContain(`careers #1 "Vermin Hunter": tier1_skills "${skill}" ${reason}`);
  });

  it("accepts open and fixed specialisations", () => {
    expect(careerSkillIssue("lore:herbs")).toBeNull();
    expect(careerSkillIssue("ranged:bow")).toBeNull();
    expect(careerSkillIssue("perception")).toBeNull();
  });

  it("rejects a malformed tier status", () => {
    const data = load();

    data.careers[0].tier1_status = "Copper 2";
    expect(issuesOf(data).some((i) => i.includes("tier1_status"))).toBe(true);
  });

  it.each(["talents", "careerTable"] as const)("rejects a profile without %s", (key) => {
    const data = load();

    delete (data.raceProfiles[0].profile as Partial<typeof data.raceProfiles[0]["profile"]>)[key];
    expect(issuesOf(data).some((i) => i.includes(`profile missing "${key}"`))).toBe(true);
  });

  it("rejects a non-ascending careerTable", () => {
    const data = load();

    data.raceProfiles[0].profile.careerTable = [
      { max: 60, careerId: "Vermin Hunter" },
      { max: 40, careerId: "Watchman" },
      { max: 100, careerId: "Watchman" },
    ];
    expect(issuesOf(data).some((i) => i.includes("creation.tableAscending"))).toBe(true);
  });

  it("rejects forbidden terms in deep strings, by word boundary", () => {
    const data = load();

    data.feats[0].description = "Blessed by SIGMAR.";
    data.races[0].passiveAbility = { name: "Stubborn", description: "From the old world" };
    data.careers[0].tier3_trappings = ["Warpstone shard"];

    const issues = issuesOf(data);

    expect(issues).toContain('feats #1 "Hardy": forbidden term "Sigmar"');
    expect(issues).toContain('races #1 "Hollander": forbidden term "Old World"');
    expect(issues).toContain('careers #1 "Vermin Hunter": forbidden term "Warpstone"');
  });

  it("does not flag substrings of forbidden terms", () => {
    const data = load();

    data.feats[0].description = "Tomorrow, chaotic";
    expect(issuesOf(data)).toEqual([]);
  });

  it("rejects a mechanical talent with broken abilities", () => {
    const data = load();

    data.feats[0].abilities = [{ name: "x", trigger: { event: "passive" }, effects: [] }];
    expect(issuesOf(data).some((i) => i.startsWith('feats #1 "Hardy": abilities'))).toBe(true);
  });

  it("scans multi-word, plural, derived and hyphenated forms", () => {
    const data = load();

    data.feats[0].description = "Daemons of the north, two Empires, Witch-Hunter's warrant, Imperials, Reiklander, Middenheimer, Bögenhafen, Snotlings";
    data.careers[0].tier1_skills = ["lore:old-world"];

    const issues = issuesOf(data).join("\n");

    for (const term of ["Daemon", "Empire", "Witch Hunter", "Imperial", "Reikland", "Middenheim", "Bögenhafen", "Snotling", "Old World"]) expect(issues).toContain(`forbidden term "${term}"`);
  });

  it("does not flag words that merely contain a term", () => {
    const data = load();

    data.feats[0].description = "Sgorfel and Chaoses of Moo, Imperially, a Mooted plan";
    expect(issuesOf(data).filter((i) => i.includes("forbidden"))).toEqual([]);
  });

  it("rejects a feat ability that is not a passive modifyStat on an allowed stat", () => {
    const data = load();

    data.feats[0].abilities = [{ id: "a1", name: "x", trigger: { event: "onHit" }, effects: [{ kind: "modifyStat", stat: "strength", flat: 1 }] }];

    const issues = issuesOf(data);

    expect(issues.some((i) => i.includes("only a passive trigger"))).toBe(true);
    expect(issues.some((i) => i.includes("only modifyStat on attackBonus/maxHp/initiative"))).toBe(true);
  });

  it("reports null profile and null profile lists instead of throwing", () => {
    const data = load();

    (data.raceProfiles[0] as { profile: unknown }).profile = null;
    expect(issuesOf(data).some((i) => i.includes("profile must be an object"))).toBe(true);

    const other = load();

    (other.raceProfiles[0].profile as unknown as Record<string, unknown>).talents = null;
    expect(issuesOf(other).some((i) => i.includes('profile "talents" must be an array'))).toBe(true);
  });
});

describe("validateGrimData: units", () => {
  const where = 'units #1 "Giant Rat": ';

  const ab = (id: string, name: string, effect: object, event = "passive") => ({ id, name, trigger: { event }, effects: [effect] });

  const regenerate = (event: string) => ab("regenerate", "Regenerate", { kind: "heal", amount: "1d10", target: "self" }, event);

  type Mutate = (rat: Record<string, any>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

  const cases: Array<[string, Mutate, string[]]> = [
    ["a missing characteristic", (r) => delete r.characteristics.base.fel, ["characteristics.base must list all 10 characteristics (missing fel)"]],
    ["extra characteristics keys", (r) => (r.characteristics.skillAdvances = {}), ["characteristics may hold only base and move (got skillAdvances)"]],
    ["an unknown theme", (r) => (r.statblock.creatureType = "Dragons"), ["statblock must be { creatureType } with one of: Beasts, Raiders, Restless Dead, Cultists, Constructs, Horrors"]],
    ["an unknown level", (r) => (r.level = 5), ["level must be one of 1, 2, 3, 4"]],
    ["a 5e column", (r) => (r.strength = 10), ['column "strength" is not used by Grim units']],
    ["the attacks column", (r) => (r.attacks = [{ name: "Bite", attackBonus: 2, damageType: "piercing", damageDice: "1d4" }]), ['column "attacks" is not used by Grim units']],
    ["armour with uneven locations", (r) => r.abilities.push(ab("armour", "Armour 1", { kind: "wfrpArmour", head: 1, body: 0, arm: 0, leg: 0 })), ['abilities[2] "Armour 1": is not the output of the "armour" trait recipe']],
    ["the terror id", (r) => r.abilities.push(ab("terror", "Terror 1", { kind: "wfrpPsychology", psychology: "terror", value: 1 })), ['abilities[2] "Terror 1": unknown trait id "terror"']],
    ["a passive regenerate", (r) => r.abilities.push(regenerate("passive")), ['abilities[2] "Regenerate": is not the output of the "regenerate" trait recipe']],
    ["breath without range", (r) => r.abilities.push(ab("breath", "Breath +3", { kind: "wfrpAttack", attack: "breath", damage: 3 })), ['abilities[2] "Breath +3": is not the output of the "breath" trait recipe']],
    ["a duplicate trait id", (r) => r.abilities.push(ab("bite", "Bite +3", { kind: "wfrpAttack", attack: "bite", damage: 3 })), ['abilities[2] "Bite +3": duplicate trait id "bite"']],
    ["a wrong speed", (r) => (r.speed = 30), ["speed 30 must equal move × 6 = 24"]],
    ["a wrong initiative", (r) => (r.initiative = 10), ["initiative 10 must equal I 30"]],
    ["a wrong gridSize", (r) => (r.gridSize = 2), ["gridSize 2 must be 1 for size small"]],
    ["a wrong maxHp", (r) => (r.maxHp = 6), ["maxHp 6 must equal Wounds 5"]],
    ["a characteristic out of band", (r) => (r.characteristics.base.ws = 60), ['characteristic "ws" 60 is outside 5–45 for level 1', "max(ws, bs) 60 is outside 20–45 for level 1"]],
    ["Ward on level 1", (r) => r.abilities.push(ab("ward", "Ward 9+", { kind: "wfrpWard", value: 9 })), ["Ward is not allowed for level 1"]],
    ["Magical on level 1", (r) => (r.abilities[1].effects[0].magical = true), ["Magical is not allowed for level 1"]],
    ["Regenerate on level 1", (r) => r.abilities.push(regenerate("turnStart")), ["Regenerate is not allowed for level 1"]],
    ["Fear above the level cap", (r) => r.abilities.push(ab("fear", "Fear 2", { kind: "wfrpPsychology", psychology: "fear", value: 2 })), ["Fear 2 is above 1 for level 1"]],
  ];

  it.each(cases)("rejects %s", (_name, mutate, expected) => {
    const data = load();

    mutate(data.units[0] as Record<string, any>); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(issuesOf(data)).toEqual(expect.arrayContaining(expected.map((e) => where + e)));
  });
});
