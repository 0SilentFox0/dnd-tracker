/**
 * Тести для участникових ID-парсерів.
 *
 * Покриває обидва експорти `parse.ts`:
 *  - parseMainSkillLevelId  — формат `${mainSkillId}_(basic|advanced|expert)_level`
 *  - inferLevelFromSkillName — UA/EN heuristic за назвою скіла
 */

import { describe, expect, it } from "vitest";

import {
  inferLevelFromSkillName,
  parseMainSkillLevelId,
} from "../parse";

describe("parseMainSkillLevelId", () => {
  it("parses expert level id", () => {
    expect(parseMainSkillLevelId("uuid-abc_expert_level")).toEqual({
      mainSkillId: "uuid-abc",
      level: "expert",
    });
  });

  it("parses advanced level id", () => {
    expect(parseMainSkillLevelId("ms-1_advanced_level")).toEqual({
      mainSkillId: "ms-1",
      level: "advanced",
    });
  });

  it("parses basic level id", () => {
    expect(parseMainSkillLevelId("ms-1_basic_level")).toEqual({
      mainSkillId: "ms-1",
      level: "basic",
    });
  });

  it("returns null for non-matching id", () => {
    expect(parseMainSkillLevelId("just-a-skill-id")).toBeNull();
  });

  it("returns null for unknown level keyword", () => {
    expect(parseMainSkillLevelId("ms-1_master_level")).toBeNull();
  });

  it("returns null when mainSkillId would be empty", () => {
    // `_basic_level` без префіксу — match є, але mainSkillId порожній
    expect(parseMainSkillLevelId("_basic_level")).toBeNull();
  });

  it("preserves mainSkillId with underscores", () => {
    expect(parseMainSkillLevelId("school_of_fire_expert_level")).toEqual({
      mainSkillId: "school_of_fire",
      level: "expert",
    });
  });
});

describe("inferLevelFromSkillName", () => {
  it("detects expert (Ukrainian)", () => {
    expect(inferLevelFromSkillName("Напад — Експерт")).toBe("expert");
  });

  it("detects expert (English)", () => {
    expect(inferLevelFromSkillName("Attack: Expert")).toBe("expert");
  });

  it("detects advanced (Ukrainian)", () => {
    expect(inferLevelFromSkillName("Захист — Просунутий")).toBe("advanced");
  });

  it("detects advanced (English)", () => {
    expect(inferLevelFromSkillName("Defense: Advanced")).toBe("advanced");
  });

  it("detects basic via 'базов'", () => {
    expect(inferLevelFromSkillName("Базова атака")).toBe("basic");
  });

  it("detects basic via 'основ'", () => {
    expect(inferLevelFromSkillName("Основи магії")).toBe("basic");
  });

  it("detects basic via 'basic'", () => {
    expect(inferLevelFromSkillName("Basic shield")).toBe("basic");
  });

  it("returns null when no level keyword", () => {
    expect(inferLevelFromSkillName("Магія хаосу")).toBeNull();
  });

  it("handles null name", () => {
    expect(inferLevelFromSkillName(null)).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(inferLevelFromSkillName("EXPERT MOVE")).toBe("expert");
    expect(inferLevelFromSkillName("експерт")).toBe("expert");
  });

  it("expert wins when multiple levels appear (first match in order)", () => {
    // Реалістично таких назв не буває, але контракт — в порядку перевірки.
    expect(inferLevelFromSkillName("Експерт чи Просунутий?")).toBe("expert");
  });
});
