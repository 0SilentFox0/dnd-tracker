import { describe, expect, it } from "vitest";

import { canLearn, canUnlearn } from "..";
import { lvl, TREE } from "./fixtures";

const learn = (unlocked: string[], nodeId: string, level = 20) => canLearn(TREE, unlocked, level, nodeId);

const ATTACK_ALL = [lvl("attack", "basic"), lvl("attack", "advanced"), lvl("attack", "expert")];

describe("canLearn", () => {
  it("noPoints: вивчено стільки, скільки рівень (сироти не рахуються)", () => {
    expect(learn([lvl("attack", "basic")], lvl("defense", "basic"), 1)).toEqual({ ok: false, reason: "noPoints" });
    expect(learn([lvl("attack", "basic"), "gone"], lvl("defense", "basic"), 2)).toEqual({ ok: true });
  });

  it("alreadyLearned і notInTree", () => {
    expect(learn([lvl("attack", "basic")], lvl("attack", "basic"))).toEqual({ ok: false, reason: "alreadyLearned" });
    expect(learn([], "nope")).toEqual({ ok: false, reason: "notInTree" });
  });

  it("рівні гілки строго по порядку; рівень без скіла вчиться", () => {
    expect(learn([], lvl("attack", "advanced"))).toEqual({ ok: false, reason: "branchOrder" });
    expect(learn([lvl("attack", "basic")], lvl("attack", "advanced"))).toEqual({ ok: true });
    expect(learn([], lvl("light", "basic"))).toEqual({ ok: true });
  });

  it("outerLimit: зовнішніх не більше, ніж рівнів гілки", () => {
    expect(learn([], "o1")).toEqual({ ok: false, reason: "outerLimit" });
    expect(learn([lvl("attack", "basic")], "o1")).toEqual({ ok: true });
    expect(learn([lvl("attack", "basic"), "o1"], "o2")).toEqual({ ok: false, reason: "outerLimit" });
    expect(learn([lvl("attack", "basic"), lvl("attack", "advanced"), "o1"], "o2")).toEqual({ ok: true });
  });

  it("needOuter: середній після зовнішнього тієї ж гілки", () => {
    expect(learn([lvl("attack", "basic")], "m1")).toEqual({ ok: false, reason: "needOuter" });
    expect(learn([lvl("attack", "basic"), lvl("defense", "basic"), "d-o1"], "m1")).toEqual({ ok: false, reason: "needOuter" });
    expect(learn([lvl("attack", "basic"), "o1"], "m1")).toEqual({ ok: true });
  });

  it("needMiddleAndExpert: внутрішній — середній + усі 3 рівні", () => {
    expect(learn([lvl("attack", "basic"), lvl("attack", "advanced"), "o1", "m1"], "i1")).toEqual({ ok: false, reason: "needMiddleAndExpert" });
    expect(learn([...ATTACK_ALL, "o1"], "i1")).toEqual({ ok: false, reason: "needMiddleAndExpert" });
    expect(learn([...ATTACK_ALL, "o1", "m1"], "i1")).toEqual({ ok: true });
  });

  it("racialLevel: 5 / 10 / 15, і по порядку", () => {
    expect(learn([], "racial_basic_racial", 4)).toEqual({ ok: false, reason: "racialLevel" });
    expect(learn([], "racial_basic_racial", 5)).toEqual({ ok: true });
    expect(learn([], "racial_advanced_racial", 10)).toEqual({ ok: false, reason: "branchOrder" });
    expect(learn(["racial_basic_racial"], "racial_advanced_racial", 9)).toEqual({ ok: false, reason: "racialLevel" });
  });

  it("needInner: ультимейт після 3 внутрішніх у всьому дереві", () => {
    const twoInner = [...ATTACK_ALL, "o1", "m1", "i1", lvl("defense", "basic"), lvl("defense", "advanced"), lvl("defense", "expert"), "d-o1", "d-m1", "d-i1"];

    expect(learn(twoInner, "ult")).toEqual({ ok: false, reason: "needInner" });

    const threeInner = [...twoInner, lvl("chaos", "basic"), lvl("chaos", "advanced"), lvl("chaos", "expert"), "c-o1", "c-m1", "c-i1"];

    expect(learn(threeInner, "ult")).toEqual({ ok: true });
  });
});

describe("canUnlearn", () => {
  it("notLearned", () => {
    expect(canUnlearn(TREE, [], "o1")).toEqual({ ok: false, reason: "notLearned" });
  });

  it("сироту можна зняти завжди", () => {
    expect(canUnlearn(TREE, ["gone"], "gone")).toEqual({ ok: true });
  });

  it("не можна зняти Основи при Просунутому", () => {
    expect(canUnlearn(TREE, [lvl("attack", "basic"), lvl("attack", "advanced")], lvl("attack", "basic"))).toEqual({ ok: false, reason: "hasDependents" });
  });

  it("не можна зняти останній зовнішній при середньому", () => {
    expect(canUnlearn(TREE, [lvl("attack", "basic"), "o1", "m1"], "o1")).toEqual({ ok: false, reason: "hasDependents" });
  });

  it("не можна зняти рівень, якщо зовнішніх стане більше за рівні", () => {
    const unlocked = [lvl("attack", "basic"), lvl("attack", "advanced"), "o1", "o2"];

    expect(canUnlearn(TREE, unlocked, lvl("attack", "advanced"))).toEqual({ ok: false, reason: "hasDependents" });
  });

  it("листок знімається", () => {
    expect(canUnlearn(TREE, [lvl("attack", "basic"), "o1", "m1"], "m1")).toEqual({ ok: true });
  });
});
