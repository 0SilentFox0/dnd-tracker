import { describe, expect, it } from "vitest";

import { classSkillIssues, skillIdsInPicks } from "@/lib/utils/characters/choices/class-skills";

const cls = { skillChoices: { count: 2, from: ["athletics", "perception", "survival"] } };

describe("classSkillIssues", () => {
  it("accepts picks from the class list within count", () => {
    expect(classSkillIssues({ skills: { athletics: true, perception: true }, cls, otherSources: [] })).toEqual([]);
  });

  it("rejects a skill outside the list", () => {
    expect(classSkillIssues({ skills: { arcana: true }, cls, otherSources: [] })[0]).toMatchObject({ code: "SKILL_NOT_ALLOWED", path: "skills" });
  });

  it("rejects more than count", () => {
    expect(classSkillIssues({ skills: { athletics: true, perception: true, survival: true }, cls, otherSources: [] })[0].code).toBe("CHOICE_COUNT");
  });

  it("ignores skills from background or other picks", () => {
    expect(classSkillIssues({ skills: { arcana: true, athletics: true, survival: true }, cls, otherSources: ["arcana"] })).toEqual([]);
  });

  it("does not restrict classes without a skill list", () => {
    expect(classSkillIssues({ skills: { arcana: true }, cls: { skillChoices: { count: 0, from: [] } }, otherSources: [] })).toEqual([]);
  });
});

describe("skillIdsInPicks", () => {
  it("collects nested skill ids", () => {
    expect(skillIdsInPicks({ a: [{ id: "arcana" }, { id: "x", picks: { b: [{ id: "stealth" }] } }] })).toEqual(["arcana", "stealth"]);
  });
});
