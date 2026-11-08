import { describe, expect, it } from "vitest";

import { wfrpParticipantFields } from "../participant";

describe("wfrpParticipantFields", () => {
  it("never carries the XP ledger into participant abilities", () => {
    const entry = { id: "l1", at: "2026-01-01T00:00:00.000Z", kind: "skill", key: "melee:basic", from: 0, to: 1, cost: 10 };

    const fields = wfrpParticipantFields({ characteristics: { talents: { f1: 1 }, ledger: [entry] } });

    expect(fields.characteristics.ledger).toEqual([]);
    expect(fields.characteristics.talents).toEqual({ f1: 1 });
  });

  it("never carries downtime into participant abilities", () => {
    const fields = wfrpParticipantFields({ characteristics: { downtime: { ailments: [] } } });

    expect("downtime" in fields.characteristics).toBe(false);
  });
});
