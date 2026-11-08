import { describe, expect, it } from "vitest";

import { resolveEndeavour, validateEndeavour } from "../endeavours";
import type { Endeavour } from "../types";

import { type Characteristics, DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems/wfrp/characteristics/keys";

const rng = () => 0.5;

const chars = (skillAdvances: Record<string, number> = {}): Characteristics => ({ ...DEFAULT_CHARACTERISTICS, skillAdvances });

const charm: Endeavour = { kind: "earn", params: { skill: "charm" } };

describe("resolveEndeavour earn", () => {
  const run = (presetRoll: number, status?: string | null) => resolveEndeavour(charm, { characteristics: chars(), status, rng, presetRoll });

  it("pays SL times status level in the status coin", () => {
    expect(run(15, "Silver 2").coins).toEqual({ coin: "sp", amount: 4 });
  });

  it("pays at least one level-unit on SL 0", () => {
    expect(run(30, "Silver 2").coins?.amount).toBe(2);
  });

  it("pays nothing on failure", () => {
    const r = run(80, "Silver 2");

    expect(r.coins).toBeUndefined();
    expect(r.test?.outcome).toBe("failure");
  });

  it("does not treat doubles as critical", () => {
    expect(run(22, "Silver 2").test?.outcome).toBe("success");
  });

  it("defaults to brass 1 and honours gold", () => {
    expect(run(15).coins).toEqual({ coin: "cp", amount: 2 });
    expect(run(15, "Gold 1").coins?.coin).toBe("gp");
  });

  it("uses the trade specialisation target", () => {
    const r = resolveEndeavour({ kind: "earn", params: { skill: "trade", spec: "smith" } }, { characteristics: chars({ "trade:smith": 5 }), rng, presetRoll: 15 });

    expect(r.test?.target).toBe(35);
  });
});

describe("resolveEndeavour train/tend/other", () => {
  const research = chars({ research: 5 });

  const train: Endeavour = { kind: "train", params: { kind: "skill", key: "melee:basic" } };

  it("grants a training discount", () => {
    expect(resolveEndeavour(train, { characteristics: research, rng, presetRoll: 15 }).training).toEqual({ kind: "skill", key: "melee:basic", discount: 15 });
  });

  it("grants nothing on failure", () => {
    expect(resolveEndeavour(train, { characteristics: research, rng, presetRoll: 90 }).training).toBeUndefined();
  });

  const tend: Endeavour = { kind: "tend", params: { patientId: "p" } };

  const heal = chars({ heal: 5 });

  it.each([
    [25, 1],
    [35, 1],
    [5, 3],
  ])("tend roll %i heals %i", (presetRoll, amount) => {
    expect(resolveEndeavour(tend, { characteristics: heal, rng, presetRoll }).tend).toEqual({ patientId: "p", heal: amount, days: amount });
  });

  it("tend failure yields nothing", () => {
    expect(resolveEndeavour(tend, { characteristics: heal, rng, presetRoll: 90 }).tend).toBeUndefined();
  });

  it("rest and custom are untested", () => {
    expect(resolveEndeavour({ kind: "rest", params: {} }, { characteristics: chars(), rng })).toEqual({});
    expect(resolveEndeavour({ kind: "custom", params: { text: "x" } }, { characteristics: chars(), rng })).toEqual({});
  });
});

describe("validateEndeavour", () => {
  const c = chars();

  it("requires trained skills", () => {
    expect(validateEndeavour({ kind: "train", params: { kind: "skill", key: "x" } }, c)).toBe("SKILL_UNTRAINED");
    expect(validateEndeavour({ kind: "tend", params: { patientId: "p" } }, c)).toBe("SKILL_UNTRAINED");
    expect(validateEndeavour({ kind: "earn", params: { skill: "trade", spec: "smith" } }, c)).toBe("SKILL_UNTRAINED");
  });

  it("accepts basic and free endeavours", () => {
    expect(validateEndeavour(charm, c)).toBeNull();
    expect(validateEndeavour({ kind: "rest", params: {} }, c)).toBeNull();
    expect(validateEndeavour({ kind: "custom", params: { text: "x" } }, c)).toBeNull();
    expect(validateEndeavour({ kind: "earn", params: { skill: "trade", spec: "smith" } }, chars({ "trade:smith": 1 }))).toBeNull();
  });
});
