import { describe, expect, it } from "vitest";

import { REST_HEAL_MULTIPLIER } from "../constants";
import { type PeriodHero, type PeriodInput, planPeriod } from "../plan-period";
import type { DowntimeState } from "../types";

import { type Characteristics, DEFAULT_CHARACTERISTICS } from "@/systems/wfrp/rules/characteristics/keys";

const rng = () => 0.5;

const hero = (id: string, downtime?: DowntimeState, over: Partial<PeriodHero> = {}, skillAdvances: Record<string, number> = {}): PeriodHero => {
  const characteristics: Characteristics = { ...DEFAULT_CHARACTERISTICS, skillAdvances, ...(downtime ? { downtime } : {}) };

  return { id, resources: {}, characteristics, maxHp: 12, ...over };
};

const run = (heroes: PeriodHero[], presets: PeriodInput["presets"] = {}, days = 1) => planPeriod({ heroes, days, rules: { tables: {} }, rng, periodId: "p1", now: "2026-11-08", presets });

const noEvent = { event: 5 };

const earn: DowntimeState = { ailments: [], endeavour: { kind: "earn", params: { skill: "charm" } } };

describe("planPeriod", () => {
  it("skips the dead", () => {
    const dead = hero("a", earn, { resources: { dead: true, hp: 0 } });

    const [r] = run([dead]);

    expect(r.summary).toEqual({ skipped: "dead", healed: 0, ailments: [] });
    expect(r.resources).toEqual(dead.resources);
    expect(r.characteristics.downtime?.lastPeriod?.id).toBe("p1");
  });

  it("skips the endeavour of an incapacitated hero but heals and rolls an event", () => {
    const [r] = run([hero("a", earn, { resources: { hp: 0 } })], { a: { ...noEvent, endeavour: 15 } });

    expect(r.summary.skipped).toBe("incapacitated");
    expect(r.summary.endeavour).toBeUndefined();
    expect(r.coins).toBeUndefined();
    expect(r.summary.healed).toBeGreaterThan(0);
    expect(r.summary.event).toBeDefined();
    expect(r.characteristics.downtime?.endeavour).toEqual(earn.endeavour);
  });

  it("flags absent and dead patients", () => {
    const tend: DowntimeState = { ailments: [], endeavour: { kind: "tend", params: { patientId: "x" } } };

    const healer = hero("h", tend, {}, { heal: 5 });

    const [r] = run([healer], { h: noEvent });

    expect(r.summary.endeavour?.skipped).toBe("patientAbsent");

    const corpse = hero("x", undefined, { resources: { dead: true } });

    const [r2, r3] = run([healer, corpse], { h: noEvent });

    expect(r2.summary.endeavour?.skipped).toBe("patientAbsent");
    expect(r3.summary.healed).toBe(0);
  });

  it("tend heals the patient and shortens the nearest ailment", () => {
    const tend: DowntimeState = { ailments: [], endeavour: { kind: "tend", params: { patientId: "p" } } };

    const patient = hero("p", { ailments: [{ id: "d1", kind: "disease", daysLeft: 9, label: "d" }, { id: "d2", kind: "disease", daysLeft: 5, label: "d" }] }, { resources: { hp: 2 } });

    const [, p] = run([hero("h", tend, {}, { heal: 5 }), patient], { h: { endeavour: 25, event: 5 }, p: noEvent });

    expect(p.resources.hp).toBe(2 + 3 + 1);
    expect(p.characteristics.downtime?.ailments.map((a) => a.daysLeft)).toEqual([8, 3]);
  });

  it("rest multiplies healing", () => {
    const rest: DowntimeState = { ailments: [], endeavour: { kind: "rest", params: {} } };

    const [r] = run([hero("a", rest, { resources: { hp: 1 } })], { a: noEvent });

    expect(r.resources.hp).toBe(1 + 3 * REST_HEAL_MULTIPLIER);
  });

  it("subtracts festering and event wounds after healing, flooring at 0", () => {
    const sick: DowntimeState = { ailments: [{ id: "f", kind: "festering", daysLeft: 1, label: "f" }] };

    const [r] = run([hero("a", sick, { resources: { hp: 2 } })], { a: { event: 25, ailments: [90] } });

    expect(r.resources.hp).toBe(2 + 3 - 2 - 1);

    const [low] = run([hero("a", sick, { resources: { hp: 1 } })], { a: { event: 85, ailments: [90] } });

    expect(low.resources.hp).toBe(0);
  });

  it("records a snapshot", () => {
    const sick: DowntimeState = { ...earn, ailments: [{ id: "d1", kind: "disease", daysLeft: 1, label: "d" }, { id: "d2", kind: "disease", daysLeft: 9, label: "d" }] };

    const [r] = run([hero("a", sick, { resources: { hp: 2 }, status: "Silver 2" })], { a: { ...noEvent, endeavour: 15 } });

    const snap = r.characteristics.downtime?.lastPeriod;

    expect(snap?.before.hp).toBe(2);
    expect(snap?.before.ailments).toHaveLength(2);
    expect(snap?.after.hp).toBe(5);
    expect(snap?.after.ailmentIds).toEqual(["d2"]);
    expect(snap?.coins).toEqual({ coin: "sp", amount: 4 });
    expect(r.coins).toEqual({ coin: "sp", amount: 4 });
  });

  it("full hp leaves hp undefined", () => {
    const [r] = run([hero("a", undefined, { resources: { hp: 11 } })], { a: noEvent });

    expect(r.resources.hp).toBeUndefined();
    expect(r.characteristics.downtime?.lastPeriod?.after.hp).toBeUndefined();
  });

  it("train replaces training and the endeavour persists", () => {
    const train: DowntimeState = { ailments: [], training: { kind: "skill", key: "old", discount: 5 }, endeavour: { kind: "train", params: { kind: "skill", key: "new" } } };

    const [r] = run([hero("a", train, {}, { research: 5 })], { a: { ...noEvent, endeavour: 15 } });

    expect(r.characteristics.downtime?.training).toEqual({ kind: "skill", key: "new", discount: 15 });
    expect(r.characteristics.downtime?.endeavour).toEqual(train.endeavour);
  });
});
