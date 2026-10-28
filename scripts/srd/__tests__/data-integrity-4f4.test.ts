import { describe, expect, it } from "vitest";

import { readSrdData } from "../lib/data-files";
import type { ClassRow } from "../lib/types";

const data = readSrdData();

const groups = (c: ClassRow) => [...c.features, ...c.subclasses.flatMap((s) => s.features)];

const classChoices = data.classes.flatMap((c) => groups(c).flatMap((g) => g.choices ?? []));

const byKind = (kind: string) => classChoices.filter((c) => c.kind === kind);

const SPELL_LIST_COUNTS: Record<string, number> = { Wizard: 218, Sorcerer: 140, Bard: 130, Druid: 124, Cleric: 109, Warlock: 72, Ranger: 48, Paladin: 38 };

describe("SRD 5.2 data: 4f-4", () => {
  it("17 feats: 4 origin, 2 general, 4 fighting styles, 7 epic boons; ASI, Skilled, Magic Initiate repeatable", () => {
    const count = (type: string) => data.feats.filter((f) => f.type === type).length;

    expect([count("origin"), count("general"), count("fightingStyle"), count("epicBoon")]).toEqual([4, 2, 4, 7]);
    expect(data.feats.filter((f) => f.repeatable).map((f) => f.name).sort()).toEqual(["Ability Score Improvement", "Magic Initiate", "Skilled"]);
  });

  it("race choices: 24 lineage options, 22 spells, every spell name exists", () => {
    const options = data.races.flatMap((r) => r.choices?.find((c) => c.lineage)?.options ?? []);

    const names = new Set(data.spells.map((s) => s.name));

    const refs = options.flatMap((o) => o.spells ?? []);

    expect(options).toHaveLength(24);
    expect(refs).toHaveLength(22);
    expect(refs.filter((s) => !names.has(s.spellId))).toEqual([]);
    expect(data.races.filter((r) => r.choices?.length).map((r) => r.name).sort()).toEqual(["Dragonborn", "Elf", "Gnome", "Goliath", "Human", "Tiefling"]);
  });

  it("101 class choices: 67 feat, 7 expertise, 2 skill, 15 spell, 10 option", () => {
    expect(classChoices).toHaveLength(101);
    expect([byKind("feat").length, byKind("expertise").length, byKind("skill").length, byKind("spell").length, byKind("option").length]).toEqual([67, 7, 2, 15, 10]);
    expect(classChoices.filter((c) => c.id.startsWith("ability-score-improvement"))).toHaveLength(51);
    expect(classChoices.filter((c) => c.id === "epic-boon-19")).toHaveLength(12);
  });

  it("every feat type a choice offers has at least one feat", () => {
    const types = new Set(data.feats.map((f) => f.type));

    for (const c of [...classChoices, ...data.races.flatMap((r) => r.choices ?? [])].filter((x) => x.kind === "feat")) for (const t of c.featTypes ?? []) expect(types.has(t), `${c.id}: ${t}`).toBe(true);
  });

  it("8 spell lists, each matches Spell.classes counts", () => {
    const casters = data.classes.filter((c) => c.spellList);

    expect(casters.map((c) => c.name).sort()).toEqual(Object.keys(SPELL_LIST_COUNTS).sort());

    for (const c of casters) expect(data.spells.filter((s) => s.lists.includes(c.spellList as string)).length, c.name).toBe(SPELL_LIST_COUNTS[c.name]);
  });

  it("metamagic 9 options, invocations 28; scale columns exist", () => {
    expect(classChoices.find((c) => c.id === "metamagic")?.options).toHaveLength(9);
    expect(classChoices.find((c) => c.id === "eldritch-invocations")?.options).toHaveLength(28);

    for (const c of data.classes) for (const ch of groups(c).flatMap((g) => g.choices ?? [])) if (typeof ch.count !== "number") expect(c.columns.some((col) => col.key === (ch.count as { scale: string }).scale), `${c.name}: ${ch.id}`).toBe(true);
  });
});
