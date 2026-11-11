import { describe, expect, it } from "vitest";

import { PARTICIPANT_SLOT, type WfrpParticipantSlot } from "../../slots";
import { wfrpBaseStats, wfrpParticipantFields } from "../participant";

import { value } from "@/systems/wfrp/rules/characteristics";

describe("wfrpParticipantFields", () => {
  it("never carries the XP ledger into participant abilities", () => {
    const entry = { id: "l1", at: "2026-01-01T00:00:00.000Z", kind: "skill", key: "melee:basic", from: 0, to: 1, cost: 10 };

    const fields = PARTICIPANT_SLOT.read(wfrpParticipantFields({ characteristics: { talents: { f1: 1 }, ledger: [entry] } })) as WfrpParticipantSlot;

    expect(fields.characteristics.ledger).toEqual([]);
    expect(fields.characteristics.talents).toEqual({ f1: 1 });
  });

  it("never carries downtime into participant abilities", () => {
    const fields = PARTICIPANT_SLOT.read(wfrpParticipantFields({ characteristics: { downtime: { ailments: [] } } })) as WfrpParticipantSlot;

    expect("downtime" in fields.characteristics).toBe(false);
  });

  const mutation = (effects: unknown[]) => ({ id: "m", at: "2026-01-01T00:00:00.000Z", kind: "physical", roll: 1, text: "x", effects });

  it("folds corruption into effective values and never carries it", () => {
    const fields = PARTICIPANT_SLOT.read(wfrpParticipantFields({ characteristics: { corruption: { points: 3, mutations: [mutation([{ type: "characteristic", key: "ws", amount: -10 }, { type: "characteristic", key: "ag", amount: -10 }])] }, downtime: { ailments: [] } } })) as WfrpParticipantSlot;

    expect("corruption" in fields.characteristics).toBe(false);
    expect("downtime" in fields.characteristics).toBe(false);
    expect(value(fields.characteristics, "ws")).toBe(20);
    expect(fields.stats.ag).toBe(20);
  });

  it("wfrpBaseStats speed uses the mutated move", () => {
    expect(wfrpBaseStats({ characteristics: { corruption: { points: 0, mutations: [mutation([{ type: "move", amount: -1 }])] } } }).speed).toBe(3 * 2 * 3);
  });
});
