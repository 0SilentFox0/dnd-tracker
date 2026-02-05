import { describe, it, expect } from "vitest";
import { evaluateTrigger } from "../trigger-evaluator";

describe("TriggerEvaluator", () => {
  it("evaluates simple event triggers", () => {
    expect(evaluateTrigger("onHit", { event: "onHit" })).toBe(true);
    expect(evaluateTrigger("onHit", { event: "onKill" })).toBe(false);
    expect(evaluateTrigger("!onHit", { event: "onKill" })).toBe(true);
  });

  it("evaluates numeric comparisons", () => {
    expect(evaluateTrigger("allyHP < 10", { allyHP: 5 })).toBe(true);
    expect(evaluateTrigger("allyHP < 10", { allyHP: 15 })).toBe(false);
    expect(evaluateTrigger("allyHP >= 10", { allyHP: 10 })).toBe(true);
  });

  it("evaluates boolean logic", () => {
    // True && True
    expect(
      evaluateTrigger("onHit && allyHP < 10", { event: "onHit", allyHP: 5 }),
    ).toBe(true);
    // True && False
    expect(
      evaluateTrigger("onHit && allyHP < 10", { event: "onHit", allyHP: 15 }),
    ).toBe(false);
    // False || True
    expect(
      evaluateTrigger("onHit || allyHP < 10", { event: "onKill", allyHP: 5 }),
    ).toBe(true);
  });

  it("evaluates rand()", () => {
    // Mocking RNG via context (impl detail support)
    // Our evaluateTrigger supports 'rng' context prop for testing
    expect(evaluateTrigger("rand() < 0.5", { rng: 0.4 })).toBe(true);
    expect(evaluateTrigger("rand() < 0.5", { rng: 0.6 })).toBe(false);
  });

  it("handles complex combinations", () => {
    const trigger = "onHit && (rand() < 0.4 || allyHP <= 10)";

    // Case 1: onHit + rand hit
    expect(
      evaluateTrigger(trigger, { event: "onHit", rng: 0.3, allyHP: 100 }),
    ).toBe(true);

    // Case 2: onHit + rand miss + ally low
    expect(
      evaluateTrigger(trigger, { event: "onHit", rng: 0.9, allyHP: 5 }),
    ).toBe(true);

    // Case 3: onHit + rand miss + ally high
    expect(
      evaluateTrigger(trigger, { event: "onHit", rng: 0.9, allyHP: 100 }),
    ).toBe(false);

    // Case 4: wrong event
    expect(
      evaluateTrigger(trigger, { event: "onKill", rng: 0.1, allyHP: 5 }),
    ).toBe(false);
  });
});
