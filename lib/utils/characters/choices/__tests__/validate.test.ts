import { API_ERRORS } from "@/lib/constants/api-errors";
import { describe, expect, it } from "vitest";

import { featsById, scores, sorcerer, spellsById } from "./fixtures";

import type { DndSkill } from "@/lib/constants/skills";
import { classChoiceDefs } from "@/lib/utils/characters/choices/class-choices";
import { resolveChoiceCount } from "@/lib/utils/characters/choices/count";
import { type PickContext, validatePicks } from "@/lib/utils/characters/choices/validate";
import type { Picks } from "@/types/choices";

const defs = classChoiceDefs(sorcerer, null);

const ctx = (level: number, extra: Partial<PickContext> = {}): PickContext => ({
  owner: "class",
  level,
  totalLevel: level,
  columns: sorcerer.columns,
  maxSlotLevel: level >= 5 ? 3 : 1,
  featsById,
  spellsById,
  proficient: new Set<DndSkill>(["stealth"]),
  scores,
  featCounts: new Map(),
  ...extra,
});

const codes = (picks: Picks, level: number, extra?: Partial<PickContext>) => validatePicks(defs, picks, ctx(level, extra), "classes.cls-sorc").map((i) => i.code);

describe("resolveChoiceCount", () => {
  it("number, class column at the class level, abilityScore → points", () => {
    const metamagic = defs.find((d) => d.id === "metamagic")!;

    expect(resolveChoiceCount(metamagic, 2, sorcerer.columns)).toBe(2);
    expect(resolveChoiceCount(metamagic, 10, sorcerer.columns)).toBe(4);
    expect(resolveChoiceCount(metamagic, 17, sorcerer.columns)).toBe(6);
    expect(resolveChoiceCount(metamagic, 2, [])).toBe(0);
    expect(resolveChoiceCount({ id: "a", label: "A", level: 1, count: 1, kind: "abilityScore", points: 2 }, 1)).toBe(2);
  });
});

describe("validatePicks", () => {
  it("options: unknown, minLevel, requires, duplicate, count", () => {
    expect(codes({ metamagic: [{ id: "nope" }] }, 2)).toEqual(["CHOICE_UNKNOWN"]);
    expect(codes({ metamagic: [{ id: "careful" }] }, 2)).toEqual(["CHOICE_MIN_LEVEL"]);
    expect(codes({ metamagic: [{ id: "empowered" }] }, 3)).toEqual(["CHOICE_REQUIRES"]);
    expect(codes({ metamagic: [{ id: "careful" }, { id: "empowered" }] }, 3)).toEqual([]);
    expect(codes({ metamagic: [{ id: "quickened" }, { id: "quickened" }] }, 2)).toEqual(["CHOICE_DUPLICATE"]);
    expect(codes({ metamagic: [{ id: "quickened" }, { id: "twinned" }, { id: "careful" }] }, 3)).toEqual(["CHOICE_COUNT"]);
    expect(codes({ metamagic: [{ id: "quickened" }, { id: "twinned" }, { id: "careful" }] }, 10)).toEqual([]);
  });

  it("unknown choice id is an error; a closed choice is skipped", () => {
    expect(codes({ ghost: [{ id: "x" }] }, 2)).toEqual(["CHOICE_UNKNOWN"]);
    expect(codes({ "ability-score-improvement-4": [{ id: "anything" }] }, 2)).toEqual([]);
  });

  it("spells: list tag and circle up to the class' highest slot", () => {
    expect(codes({ cantrips: [{ id: "sp-firebolt" }] }, 1)).toEqual([]);
    expect(codes({ cantrips: [{ id: "sp-guidance" }] }, 1)).toEqual(["SPELL_NOT_IN_LIST"]);
    expect(codes({ "prepared-spells": [{ id: "sp-missile" }] }, 1)).toEqual([]);
    expect(codes({ "prepared-spells": [{ id: "sp-cure" }] }, 1)).toEqual(["SPELL_NOT_IN_LIST"]);
    expect(codes({ "prepared-spells": [{ id: "sp-fireball" }] }, 1)).toEqual(["SPELL_NOT_IN_LIST"]);
    expect(codes({ "prepared-spells": [{ id: "sp-fireball" }] }, 5)).toEqual([]);
  });

  it("feats: type, prerequisite (level and any-of scores), not repeatable, nested picks", () => {
    expect(codes({ "ability-score-improvement-4": [{ id: "f-archery" }] }, 4)).toEqual(["FEAT_TYPE"]);
    expect(codes({ "ability-score-improvement-4": [{ id: "f-grappler" }] }, 4, { scores: { ...scores, strength: 12, dexterity: 12 } })).toEqual(["FEAT_PREREQUISITE"]);
    expect(codes({ "ability-score-improvement-4": [{ id: "f-grappler", picks: { "grappler-asi": [{ id: "dexterity" }] } }] }, 4)).toEqual([]);
    expect(codes({ "ability-score-improvement-4": [{ id: "f-grappler" }] }, 4, { featCounts: new Map([["f-grappler", 2]]) })).toEqual(["FEAT_NOT_REPEATABLE"]);
    expect(codes({ "ability-score-improvement-4": [{ id: "f-grappler", picks: { "grappler-asi": [{ id: "charisma" }] } }] }, 4)).toEqual(["CHOICE_UNKNOWN"]);
    expect(codes({ "ability-score-improvement-4": [{ id: "f-asi", picks: { asi: [{ id: "strength" }, { id: "strength" }, { id: "dexterity" }] } }] }, 4)).toEqual(["CHOICE_COUNT"]);
  });

  it("skills and expertise", () => {
    const skillDefs = [
      { id: "keen", label: "Keen", level: 1, count: 1, kind: "skill" as const, skills: ["insight" as const, "perception" as const] },
      { id: "exp", label: "Expertise", level: 1, count: 2, kind: "expertise" as const },
    ];

    const check = (picks: Picks) => validatePicks(skillDefs, picks, ctx(1, { owner: "race" }), "raceChoices").map((i) => i.code);

    expect(check({ keen: [{ id: "stealth" }] })).toEqual(["SKILL_NOT_ALLOWED"]);
    expect(check({ keen: [{ id: "insight" }] })).toEqual([]);
    expect(check({ exp: [{ id: "stealth" }] })).toEqual([]);
    expect(check({ exp: [{ id: "arcana" }] })).toEqual(["EXPERTISE_NEEDS_PROFICIENCY"]);
  });

  it("issue paths and Ukrainian messages", () => {
    const [issue] = validatePicks(defs, { metamagic: [{ id: "nope" }] }, ctx(2), "classes.cls-sorc");

    expect(issue).toMatchObject({ path: "classes.cls-sorc.metamagic", code: "CHOICE_UNKNOWN" });
    expect(issue.message).toContain(API_ERRORS.CHOICE_UNKNOWN);
  });
});
