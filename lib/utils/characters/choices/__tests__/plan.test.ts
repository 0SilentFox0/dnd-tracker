import { describe, expect, it } from "vitest";

import { empty, refs, rogue, scores, sorcerer } from "./fixtures";

import { planChoices,type PlanInput } from "@/lib/utils/characters/choices/plan";
import type { ChoicesState, Picks } from "@/types/choices";

const sorc = (level: number, choices?: Picks) => ({ classId: sorcerer.id, level, ...(choices && { choices }) });

const asiPick = (a: string, b: string): Picks => ({ "ability-score-improvement-4": [{ id: "f-asi", picks: { asi: [{ id: a }, { id: b }] } }] });

const input = (before: Partial<ChoicesState>, after: Partial<ChoicesState>, extra: Partial<PlanInput> = {}): PlanInput => ({
  before: { ...empty, ...before },
  after: { ...empty, ...after },
  refs,
  classMode: true,
  isDM: true,
  level: 4,
  scores,
  skills: { stealth: true },
  ...extra,
});

const fail = (r: ReturnType<typeof planChoices>) => (r.ok ? null : r.code);

describe("planChoices", () => {
  it("race lineage sets subrace; race picks work without class mode", () => {
    const r = planChoices(input({}, { raceChoices: { "elven-lineage": [{ id: "wood-elf" }], "keen-senses": [{ id: "perception" }] } }, { classMode: false, level: 1 }));

    expect(r).toMatchObject({ ok: true, subrace: "Wood Elf", scores: {} });
  });

  it("ASI: add writes the delta, swap moves it, removal reverts", () => {
    expect(planChoices(input({ classes: [sorc(4)] }, { classes: [sorc(4, asiPick("strength", "strength"))] }))).toMatchObject({ ok: true, scores: { strength: 17 } });
    expect(planChoices(input({ classes: [sorc(4, asiPick("strength", "strength"))] }, { classes: [sorc(4, asiPick("dexterity", "dexterity"))] }, { scores: { ...scores, strength: 17 } }))).toMatchObject({
      ok: true,
      scores: { strength: 15, dexterity: 16 },
    });
    expect(planChoices(input({ classes: [sorc(4, asiPick("strength", "strength"))] }, { classes: [sorc(4)] }, { scores: { ...scores, strength: 17 } }))).toMatchObject({ ok: true, scores: { strength: 15 } });
  });

  it("cap 20 on the result; a DM-raised score above the cap does not block other edits", () => {
    expect(fail(planChoices(input({ classes: [sorc(4)] }, { classes: [sorc(4, asiPick("charisma", "charisma"))] }, { scores: { ...scores, charisma: 19 } })))).toBe("ABILITY_SCORE_CAP");
    expect(planChoices(input({ classes: [sorc(4)] }, { classes: [sorc(4, { metamagic: [{ id: "quickened" }] })] }, { scores: { ...scores, strength: 22 } })).ok).toBe(true);
  });

  it("closed choice: stored picks may stay, changes are refused", () => {
    const stored = asiPick("strength", "strength");

    expect(planChoices(input({ classes: [sorc(3, stored)] }, { classes: [sorc(3, { ...stored, metamagic: [{ id: "quickened" }] })] }, { level: 3 })).ok).toBe(true);
    expect(fail(planChoices(input({ classes: [sorc(3, stored)] }, { classes: [sorc(3, asiPick("dexterity", "dexterity"))] }, { level: 3 })))).toBe("CHOICE_LOCKED");
  });

  it("class mode, DM feats, origin feats", () => {
    expect(fail(planChoices(input({}, { feats: [{ id: "f-alert", source: "origin" }] }, { classMode: false })))).toBe("CHOICES_NEED_CLASSES");
    expect(planChoices(input({}, { feats: [{ id: "f-archery", source: "dm" }] }, { isDM: false }))).toMatchObject({ ok: false, status: 403, code: "DM_FEAT_ONLY_DM" });
    expect(fail(planChoices(input({}, { feats: [{ id: "f-alert", source: "origin" }, { id: "f-mi", source: "origin" }] })))).toBe("ORIGIN_FEAT_ONLY_ONE");
    expect(fail(planChoices(input({}, { feats: [{ id: "f-asi", source: "origin" }] })))).toBe("FEAT_TYPE");
    expect(planChoices(input({}, { feats: [{ id: "f-alert", source: "origin" }] }, { isDM: false })).ok).toBe(true);
  });

  it("expertise sees proficiencies from Character.skills and from skill picks", () => {
    const rogueAt1 = (choices: Picks) => ({ classId: rogue.id, level: 1, choices });

    expect(planChoices(input({}, { classes: [rogueAt1({ "expertise-1": [{ id: "stealth" }] })] }, { level: 1 })).ok).toBe(true);
    expect(fail(planChoices(input({}, { classes: [rogueAt1({ "expertise-1": [{ id: "perception" }] })] }, { level: 1 })))).toBe("EXPERTISE_NEEDS_PROFICIENCY");
    expect(planChoices(input({}, { raceChoices: { "keen-senses": [{ id: "perception" }] }, classes: [rogueAt1({ "expertise-1": [{ id: "perception" }] })] }, { level: 1 })).ok).toBe(true);
  });

  it("a non-repeatable feat taken twice is refused; repeatable twice is fine", () => {
    const twice = (featId: string): Picks => ({ "ability-score-improvement-4": [{ id: featId }] });

    expect(fail(planChoices(input({}, { classes: [sorc(4, twice("f-grappler"))], feats: [{ id: "f-grappler", source: "dm" }] })))).toBe("FEAT_NOT_REPEATABLE");
    expect(planChoices(input({}, { classes: [sorc(4, twice("f-mi"))], feats: [{ id: "f-mi", source: "origin" }] })).ok).toBe(true);
  });
});
