import { describe, expect, it } from "vitest";

import { bundleToPack, leakedIds } from "../lib/export";
import type { PackRow } from "../lib/pack";
import { treeFromPack } from "../systems/homm/skill-trees";

import { emptyBundle } from "@/lib/server/templates/bundle";
import type { TemplateManifest } from "@/lib/utils/templates/manifest";

const ID = (n: number) => `c${String(n).padStart(24, "0")}`;

const manifest: TemplateManifest = { key: "tiny", system: "homm", names: { en: "Tiny", uk: "Tiny" }, locales: ["en"], rules: { file: "rules.json" }, kinds: ["spell-groups", "spells", "races", "units", "main-skills", "skills", "artifact-sets", "artifacts", "skillTrees", "tracks"], icons: {}, counts: {} };

const GROUP = ID(1);

const SPELL = ID(2);

const RACE = ID(3);

const UNIT = ID(4);

const MAIN = ID(5);

const SKILL = ID(6);

const SET = ID(7);

const ART = ID(8);

const TREE = ID(9);

const TRACK = ID(10);

const slugs = {
  "spell-groups": { [GROUP]: "light" },
  spells: { [SPELL]: "bolt" },
  races: { [RACE]: "humans" },
  units: { [UNIT]: "swordsman" },
  "main-skills": { [MAIN]: "attack" },
  skills: { [SKILL]: "strike" },
  "artifact-sets": { [SET]: "set-one" },
  artifacts: { [ART]: "ring-one" },
  skillTrees: { [TREE]: "humans" },
  tracks: { [TRACK]: "track-01" },
};

const tree = { id: TREE, race: "Humans", mainSkills: [{ id: MAIN, name: "Attack", spellGroupId: GROUP, levelSkillIds: { basic: SKILL, expert: "placeholder_x" }, levels: { basic: { circle1: [{ id: SKILL }], circle2: [], circle3: [] } } }, { id: "racial", name: "Race", levelSkillIds: {}, levels: {} }], ultimateSkill: { id: SKILL } };

function bundle() {
  const b = emptyBundle();

  b.rules = {};
  b.spellGroups = [{ id: GROUP, name: "Light", color: "#fff", icon: "sun" }];
  b.spells = [{ id: SPELL, name: "Bolt", groupId: GROUP, level: 1, description: "d", cost: "action", type: "damage", damageType: "fire", executionMode: "native" }];
  b.races = [{ id: RACE, name: "Humans", icon: "https://x.test/humans.webp", color: "#111", abilities: [{ id: "a", name: "A", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "all", school: GROUP }, percent: 5 }] }] }];
  b.units = [{ id: UNIT, name: "Swordsman", raceId: RACE, level: 1, avatar: "https://x.test/sword.webp", levelScaling: { perLevel: 1 }, attacks: [] }];
  b.mainSkills = [{ id: MAIN, name: "Attack", color: "#f00", icon: null, spellGroupId: GROUP }];
  b.skills = [{ id: SKILL, name: "Strike", description: "s", mainSkillId: MAIN, spellId: SPELL, appearanceDescription: "looks", abilities: [] }];
  b.artifactSets = [{ id: SET, name: "Set One", description: "d", abilities: [] }];
  b.artifacts = [{ id: ART, name: "Ring One", slot: "ring1", rarity: "epic", setId: SET, modifiers: [], abilities: [] }];
  b.skillTrees = [{ id: TREE, race: "Humans", skills: tree }];
  b.tracks = [{ id: TRACK, title: "Theme", kind: "youtube", youtubeId: "abc", durationSec: 10, sortOrder: 1, url: null }];

  return b;
}

describe("bundleToPack", () => {
  it("turns id references into names and moves icon urls to icons", () => {
    const pack = bundleToPack(bundle(), manifest, slugs);

    expect(pack.rows.spells?.[0]).toMatchObject({ slug: "bolt", name: "Bolt", groupId: "Light" });
    expect(pack.rows.units?.[0]).toMatchObject({ slug: "swordsman", raceId: "Humans" });
    expect(pack.rows.units?.[0]).not.toHaveProperty("avatar");
    expect(pack.icons).toEqual({ races: { humans: "https://x.test/humans.webp" }, units: { swordsman: "https://x.test/sword.webp" } });
    expect(pack.rows["spell-groups"]?.[0]).toMatchObject({ icon: "sun" });
    expect(pack.rows.skills?.[0]).toMatchObject({ mainSkillId: "Attack", spellId: "Bolt" });
    expect(pack.rows.artifacts?.[0]).toMatchObject({ setId: "Set One" });
    expect(pack.rows["artifact-sets"]?.[0]).toMatchObject({ artifactIds: ["Ring One"] });
  });

  it("writes school names inside abilities and keeps row ids out of the pack", () => {
    const pack = bundleToPack(bundle(), manifest, slugs);

    expect(JSON.stringify(pack.rows.races)).toContain('"school":"Light"');
    expect(leakedIds(pack)).toEqual({});
    expect(pack.rows.tracks?.[0]).toEqual({ slug: "track-01", title: "Theme", kind: "youtube", youtubeId: "abc", durationSec: 10, sortOrder: 1 });
  });

  it("carries columns outside the import specs in `extra`", () => {
    const pack = bundleToPack(bundle(), manifest, slugs);

    expect(pack.rows.units?.[0].extra).toEqual({ levelScaling: { perLevel: 1 } });
    expect(pack.rows.skills?.[0].extra).toEqual({ appearanceDescription: "looks" });
  });

  it("counts rows and forces the system key into the rules", () => {
    const pack = bundleToPack(bundle(), manifest, slugs);

    expect(pack.manifest.counts).toMatchObject({ spells: 1, tracks: 1, skillTrees: 1 });
    expect(pack.rules.system.key).toBe("homm");
  });

  it("throws on a row without a slug", () => {
    expect(() => bundleToPack(bundle(), manifest, { ...slugs, spells: {} })).toThrow(/No slug for spells/);
  });

  it("flags ids that are left inside rows", () => {
    const b = bundle();

    b.units = [{ ...b.units[0], abilities: [{ id: "a", name: "A", trigger: { event: "action" }, effects: [{ kind: "summon", unitId: ID(99), count: 1 }] }] }];

    expect(leakedIds(bundleToPack(b, manifest, slugs))).toEqual({ "units.abilities.effects.unitId": 1 });
  });
});

describe("skill tree rows", () => {
  it("exports slugs for tree ids and restores the ids on import", () => {
    const pack = bundleToPack(bundle(), manifest, slugs);

    const row = pack.rows.skillTrees?.[0] as PackRow;

    expect(row).toMatchObject({ slug: "humans", race: "Humans" });

    const json = JSON.stringify(row.skills);

    expect(json).not.toContain(MAIN);
    expect(json).not.toContain(GROUP);
    expect(json).toContain('"id":"attack"');
    expect(json).toContain('"spellGroupId":"light"');
    expect(json).toContain('"basic":"strike"');
    expect(json).toContain('"expert":"placeholder_x"');
    expect(json).toContain('"id":"racial"');

    const ids = new Map([["main-skills:attack", MAIN], ["skills:strike", SKILL], ["spell-groups:light", GROUP]]);

    const restored = treeFromPack(row, { idOf: (kind, slug) => ids.get(`${kind}:${slug}`), slugOf: () => undefined, rowId: TREE });

    expect(restored.skills).toEqual(tree);
  });

  it("gives a fresh row an id that matches the id inside its JSON", () => {
    const row = treeFromPack({ slug: "humans", race: "Humans", skills: { mainSkills: [] } }, { idOf: () => undefined, slugOf: () => undefined, rowId: undefined });

    expect(typeof row.id).toBe("string");
    expect((row.skills as { id: string }).id).toBe(row.id);
  });
});
