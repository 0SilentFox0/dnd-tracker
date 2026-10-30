import { describe, expect, it } from "vitest";

import { empty, refs, scores } from "./fixtures";

import { planChoices } from "@/lib/utils/characters/choices/plan";
import type { BackgroundData } from "@/types/backgrounds";
import type { ChoicesState } from "@/types/choices";

const a: BackgroundData = { id: "a", name: "A", icon: null, description: null, skillProficiencies: ["arcana"], toolProficiencies: ["Tools"], originFeatId: "f-alert", equipmentText: null, choices: [{ id: "asi", label: "ASI", level: 1, kind: "abilityScore", points: 3, count: 3, abilities: ["strength", "dexterity", "wisdom"], max: 20, maxPerAbility: 2 }] };

const b = { ...a, id: "b", name: "B", choices: a.choices.map((c) => ({ ...c, id: "b-asi" })) };

const selection = (id: string | null, abilities: string[]): Partial<ChoicesState> => ({ backgroundId: id, backgroundChoices: { asi: abilities.map((id) => ({ id })) } });

const run = (before: Partial<ChoicesState>, after: Partial<ChoicesState>, current = scores) => planChoices({ before: { ...empty, ...before }, after: { ...empty, ...after }, refs: { ...refs, backgroundsById: { a, b } }, classMode: true, isDM: true, level: 1, scores: current, skills: {} });

describe("background choices", () => {
  it("allows 2+1 and 1+1+1 but rejects 3, unknown scores and cap overflow", () => {
    expect(run({}, selection("a", ["strength", "strength", "dexterity"]))).toMatchObject({ ok: true, scores: { strength: scores.strength + 2, dexterity: scores.dexterity + 1 } });
    expect(run({}, selection("a", ["strength", "dexterity", "wisdom"])).ok).toBe(true);
    expect(run({}, selection("a", ["strength", "strength", "strength"])).ok).toBe(false);
    expect(run({}, selection("a", ["charisma"])).ok).toBe(false);
    expect(run({}, selection("a", ["strength", "strength"]), { ...scores, strength: 19 }).ok).toBe(false);
  });
  it("swaps and removes using both definitions; repeated save is idempotent", () => {
    const before = selection("a", ["strength", "strength", "dexterity"]);

    const after = { ...selection("b", []), backgroundChoices: { "b-asi": [{ id: "dexterity" }, { id: "wisdom" }, { id: "wisdom" }] } };

    const current = { ...scores, strength: scores.strength + 2, dexterity: scores.dexterity + 1 };

    expect(run(before, after, current)).toMatchObject({ ok: true, scores: { strength: scores.strength, wisdom: scores.wisdom + 2 } });
    expect(run(before, before, current)).toMatchObject({ ok: true, scores: {} });
    expect(run(before, selection(null, []), current)).toMatchObject({ ok: true, scores: { strength: scores.strength, dexterity: scores.dexterity } });
  });
  it("rejects origin conflicts and missing backgrounds", () => {
    expect(run({}, { ...selection("a", []), feats: [{ id: "f-alert", source: "origin" }] })).toMatchObject({ ok: false });
    expect(run({}, selection("foreign", []))).toMatchObject({ ok: false });
  });
});

import { choiceSelections } from "@/lib/utils/characters/choices/selections";
it("emits background skill, tool and origin feat without copying character feats", () => {
  const result = choiceSelections({ race: null, raceChoices: {}, classes: [], feats: [], featsById: refs.featsById, level: 1, background: a, backgroundChoices: {}, backgroundFeatPicks: {} });

  expect(result.skills).toContain("arcana");
  expect(result.tools).toContain("Tools");
  expect(result.feats).toContainEqual(expect.objectContaining({ from: { message: "characterProfile.sheet.from.background", params: { name: "A" } }, feat: expect.objectContaining({ id: "f-alert" }) }));
});

it("keeps background spell pool keys across renames and separates two backgrounds", () => {
  const feat = { ...refs.featsById["f-alert"], choices: [{ id: "magic", label: "Magic", kind: "spell" as const, level: 1, count: 1, spells: { lists: [], minLevel: 0, maxLevel: 0 }, grant: { uses: 1, rest: "long" as const } }] };

  const selected = (background: BackgroundData) => choiceSelections({ race: null, raceChoices: {}, classes: [], feats: [], featsById: { [feat.id]: feat }, level: 1, background, backgroundChoices: { asi: [{ id: "strength" }, { id: "strength" }, { id: "dexterity" }] }, backgroundFeatPicks: { magic: [{ id: "spell" }] } });

  const first = selected(a);

  expect(first.spellGrants[0].sourceKey).toContain("background:");
  expect(first.spellGrants[0].sourceKey).toContain(a.id);
  expect(first.spellGrants[0].sourceKey).toContain(feat.id);
  expect(selected({ ...a, name: "Renamed" }).spellGrants[0].sourceKey).toBe(first.spellGrants[0].sourceKey);
  expect(selected(b).spellGrants[0].sourceKey).not.toBe(first.spellGrants[0].sourceKey);
  expect(first.background?.picks).toEqual([{ message: "characterProfile.sheet.abilityPick", params: { n: 2, ability: "strength" } }, { message: "characterProfile.sheet.abilityPick", params: { n: 1, ability: "dexterity" } }]);
});

import { prunePicks } from "@/lib/utils/characters/choices/prune";
it("prunes stale background choices and clears its picks after removal", () => {
  const state = { ...empty, backgroundId: "a", backgroundChoices: { ghost: [{ id: "x" }] }, backgroundFeatPicks: { ghost: [{ id: "x" }] } };

  const pruned = prunePicks(state, { ...refs, backgroundsById: { a } });

  expect(pruned.state.backgroundChoices).toEqual({});
  expect(pruned.state.backgroundFeatPicks).toEqual({});
  expect(pruned.dropped).toBe(2);
});

it("locks future background and origin feat picks before validation or ASI", () => {
  const future = { ...a, choices: [{ id: "future", label: "Future", level: 4, kind: "abilityScore" as const, count: 1, points: 1, abilities: ["strength" as const], maxPerAbility: 1 }] };

  const result = planChoices({ before: { ...empty, backgroundId: "a", backgroundChoices: {} }, after: { ...empty, backgroundId: "a", backgroundChoices: { future: [{ id: "wisdom" }, { id: "wisdom" }] } }, refs: { ...refs, backgroundsById: { a: future } }, classMode: true, isDM: false, level: 1, scores, skills: {} });

  expect(result).toMatchObject({ ok: false, issues: [expect.objectContaining({ code: "CHOICE_LOCKED" })] });
});

import { pruneFormChoices } from "@/lib/utils/characters/choices/prune";
it("copies pruned background picks back into authoring forms", () => {
  const form = { basicInfo: { classes: [] }, choices: { backgroundId: "a", backgroundChoices: { ghost: [{ id: "x" }] }, backgroundFeatPicks: { ghost: [{ id: "x" }] }, raceChoices: {}, feats: [] } };

  const pruned = pruneFormChoices(form, { ...refs, backgroundsById: { a } });

  expect(pruned.choices.backgroundChoices).toEqual({});
  expect(pruned.choices.backgroundFeatPicks).toEqual({});
});

describe("background sheet data", () => {
  it("exposes description, skills, tools and origin feat", () => {
    const bg = { ...a, description: "Scholar" };

    const result = choiceSelections({ race: null, raceChoices: {}, classes: [], feats: [], featsById: refs.featsById, level: 1, background: bg, backgroundChoices: {}, backgroundFeatPicks: {} });

    expect(result.background).toMatchObject({ description: "Scholar", skills: ["arcana"], tools: ["Tools"], originFeat: { id: "f-alert", name: refs.featsById["f-alert"]?.name } });
  });

  it("originFeat is null when the feat is not loaded", () => {
    const result = choiceSelections({ race: null, raceChoices: {}, classes: [], feats: [], featsById: {}, level: 1, background: a, backgroundChoices: {}, backgroundFeatPicks: {} });

    expect(result.background?.originFeat).toBeNull();
  });
});
