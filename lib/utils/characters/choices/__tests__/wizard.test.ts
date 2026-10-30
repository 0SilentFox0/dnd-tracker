import { describe, expect, it } from "vitest";

import { alert, featsById, refs, rogue, sorcerer } from "./fixtures";

import type { ChoiceRefs } from "@/lib/utils/characters/choices/walk";
import { picksAtStep, withStepPicks, withStepSubclass, type WizardStep, wizardSteps } from "@/lib/utils/characters/choices/wizard";
import type { BackgroundData } from "@/types/backgrounds";
import type { ChoicesState } from "@/types/choices";

const draconic = { id: "sub-dr", name: "Draconic", features: [{ level: 3, abilities: [], choices: [{ id: "ancestry", label: "Ancestry", level: 3, count: 1, kind: "option" as const, options: [{ id: "red", name: "Red", abilities: [] }] }] }] };

const sorcWithSub = { ...sorcerer, subclasses: [draconic] };

const background: BackgroundData = { id: "bg", name: "Sage", icon: null, description: null, choices: [{ id: "bg-skill", label: "Skill", level: 1, count: 1, kind: "skill" }], skillProficiencies: [], toolProficiencies: [], originFeatId: "f-mi", equipmentText: null };

const wrefs: ChoiceRefs = { ...refs, classesById: { ...refs.classesById, [sorcerer.id]: sorcWithSub }, backgroundsById: { bg: background }, featsById: { ...featsById, "f-alert": alert } };

const hero = { level: 1, classMode: true };

const state = (over: Partial<ChoicesState> = {}): ChoicesState => ({ raceChoices: {}, feats: [], classes: [{ classId: sorcerer.id, level: 1 }], ...over });

const keys = (s: ChoicesState, h = hero, keep?: Set<string>, r = wrefs) => wizardSteps(s, r, h, keep).map((x) => x.key);

describe("wizardSteps", () => {
  it("orders race, background, origin feat, classes, feats", () => {
    const s = state({ backgroundId: "bg", feats: [{ id: "f-mi", source: "dm" }], classes: [{ classId: sorcerer.id, level: 1 }, { classId: rogue.id, level: 1 }] });

    expect(keys(s)).toEqual([
      "raceChoices.elven-lineage",
      "raceChoices.keen-senses",
      "backgroundChoices.bg-skill",
      "backgroundFeatPicks.cantrips",
      `classes.${sorcerer.id}.cantrips`,
      `classes.${sorcerer.id}.prepared-spells`,
      `classes.${rogue.id}.expertise-1`,
      "feats.0.cantrips",
    ]);
  });

  it("includes only choices that are not fully picked, unless kept", () => {
    const s = state({ raceChoices: { "elven-lineage": [{ id: "drow" }] } });

    expect(keys(s)).not.toContain("raceChoices.elven-lineage");
    expect(keys(s, hero, new Set(["raceChoices.elven-lineage"]))).toContain("raceChoices.elven-lineage");
  });

  it("skips choices above the owner level", () => {
    expect(keys(state())).not.toContain(`classes.${sorcerer.id}.metamagic`);
    expect(keys(state({ classes: [{ classId: sorcerer.id, level: 2 }] }), { level: 2, classMode: true })).toContain(`classes.${sorcerer.id}.metamagic`);
  });

  it("offers the subclass first in its class only from subclassLevel and while unset", () => {
    const at3 = state({ classes: [{ classId: sorcerer.id, level: 3 }] });

    const list = keys(at3, { level: 3, classMode: true });

    expect(list.indexOf(`subclass:${sorcerer.id}`)).toBeLessThan(list.indexOf(`classes.${sorcerer.id}.cantrips`));
    expect(keys(state())).not.toContain(`subclass:${sorcerer.id}`);
    expect(keys(state({ classes: [{ classId: sorcerer.id, level: 3, subclassId: draconic.id }] }), { level: 3, classMode: true })).not.toContain(`subclass:${sorcerer.id}`);
    expect(keys(state({ classes: [{ classId: sorcerer.id, level: 3, subclassId: draconic.id }] }), { level: 3, classMode: true }, new Set([`subclass:${sorcerer.id}`]))).toContain(`subclass:${sorcerer.id}`);
  });

  it("a class without subclasses gets no subclass step", () => {
    expect(keys(state({ classes: [{ classId: sorcerer.id, level: 3 }] }), { level: 3, classMode: true }, undefined, refs)).not.toContain(`subclass:${sorcerer.id}`);
  });

  it("subclass choices appear after the subclass is picked", () => {
    const s = state({ classes: [{ classId: sorcerer.id, level: 3 }] });

    const step = wizardSteps(s, wrefs, { level: 3, classMode: true }).find((x) => x.kind === "subclass");

    if (!step) throw new Error("no subclass step");

    expect(keys(withStepSubclass(s, step, draconic.id), { level: 3, classMode: true })).toContain(`classes.${sorcerer.id}.ancestry`);
  });

  it("an empty hero has no steps", () => {
    expect(wizardSteps({ raceChoices: {}, feats: [], classes: [] }, { race: null, classesById: {}, featsById: {} }, { level: 1, classMode: false })).toEqual([]);
  });

  it("describes the source of a step", () => {
    const [first] = wizardSteps(state(), wrefs, hero);

    expect(first.source).toEqual({ owner: "race", name: "Elf" });
    expect(wizardSteps(state(), wrefs, hero).find((x) => x.key === `classes.${sorcerer.id}.cantrips`)?.source).toEqual({ owner: "class", name: "Sorcerer", level: 1 });
  });
});

describe("withStepPicks", () => {
  const stepOf = (s: ChoicesState, key: string, h = hero): WizardStep => {
    const step = wizardSteps(s, wrefs, h, new Set([key])).find((x) => x.key === key);

    if (!step) throw new Error(key);

    return step;
  };

  const list = [{ id: "x" }];

  it("writes race picks", () => {
    const s = state();

    expect(withStepPicks(s, stepOf(s, "raceChoices.keen-senses"), list).raceChoices["keen-senses"]).toEqual(list);
  });

  it("writes background and origin feat picks", () => {
    const s = state({ backgroundId: "bg" });

    expect(withStepPicks(s, stepOf(s, "backgroundChoices.bg-skill"), list).backgroundChoices).toEqual({ "bg-skill": list });
    expect(withStepPicks(s, stepOf(s, "backgroundFeatPicks.cantrips"), list).backgroundFeatPicks).toEqual({ cantrips: list });
  });

  it("writes class picks and standalone feat picks", () => {
    const s = state({ feats: [{ id: "f-mi", source: "dm" }] });

    const next = withStepPicks(withStepPicks(s, stepOf(s, `classes.${sorcerer.id}.cantrips`), list), stepOf(s, "feats.0.cantrips"), list);

    expect(next.classes[0].choices).toEqual({ cantrips: list });
    expect(next.feats[0].picks).toEqual({ cantrips: list });
    expect(picksAtStep(next, stepOf(next, "feats.0.cantrips"))).toEqual(list);
  });

  it("does not mutate the input", () => {
    const s = state();

    withStepPicks(s, stepOf(s, "raceChoices.keen-senses"), list);

    expect(s.raceChoices).toEqual({});
  });
});
