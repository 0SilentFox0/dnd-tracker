/** Тести евристики рівня скіла за назвою (inferLevelFromSkillName). */

import { describe, expect, it } from "vitest";

import { inferLevelFromSkillName } from "../parse";

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
