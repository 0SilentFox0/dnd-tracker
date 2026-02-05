import { describe, it, expect } from "vitest";
import { evaluateFormula } from "../formula-evaluator";

describe("FormulaEvaluator", () => {
  it("evaluates basic arithmetic", () => {
    expect(evaluateFormula("1 + 2", {})).toBe(3);
    expect(evaluateFormula("10 - 4", {})).toBe(6);
    expect(evaluateFormula("3 * 5", {})).toBe(15);
    expect(evaluateFormula("20 / 4", {})).toBe(5);
    expect(evaluateFormula("(2 + 3) * 4", {})).toBe(20);
  });

  it("evaluates formulas with context variables", () => {
    const context = {
      hero_level: 5,
      strength: 10,
    };
    expect(evaluateFormula("hero_level * 2", context)).toBe(10);
    expect(evaluateFormula("strength + 5", context)).toBe(15);
    // Test variable replacement safety (variable being part of another Name)
    // Actually evaluateFormula implementation handles this by sorting keys by length? Yes.
    // Let's test specific case
    expect(evaluateFormula("hero_level", { hero: 1, hero_level: 5 })).toBe(5);
  });

  it("evaluates formulas with functions", () => {
    expect(evaluateFormula("floor(3.7)", {})).toBe(3);
    expect(evaluateFormula("ceil(3.1)", {})).toBe(4);
    expect(evaluateFormula("max(10, 20)", {})).toBe(20);
    expect(evaluateFormula("min(5, 1)", {})).toBe(1);
    expect(evaluateFormula("floor(15 / 2)", {})).toBe(7);
  });

  it("handles complex formulas", () => {
    const context = {
      lost_hp_percent: 45,
    };
    // 3 * floor(45 / 10) = 3 * 4 = 12
    expect(evaluateFormula("3 * floor(lost_hp_percent / 10)", context)).toBe(
      12,
    );
  });

  it("returns 0 for unsafe input", () => {
    expect(evaluateFormula("console.log('powned')", {})).toBe(0);
    expect(evaluateFormula("alert(1)", {})).toBe(0);
    expect(evaluateFormula("function() { return 1; }()", {})).toBe(0);
  });

  it("returns 0 for invalid formulas", () => {
    expect(evaluateFormula("3 * ", {})).toBe(0);
    expect(evaluateFormula("invalid_var * 2", {})).toBe(0); // non-replaced text remains? actually invalid_var remains, making valid JS fail
  });
});
