import { describe, expect, it } from "vitest";

import { preserveServerOwned, redactLedger } from "../privacy";

import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";

const entry = { id: "e1", at: "2026-01-01T00:00:00.000Z", kind: "characteristic", key: "ws", from: 0, to: 1, cost: 25 } as const;

const existing = { ...DEFAULT_CHARACTERISTICS, advances: { ...DEFAULT_CHARACTERISTICS.advances, ws: 1 }, skillAdvances: { "melee:basic": 2 }, talents: { feat: 1 }, ledger: [entry], spentArchived: 70 };

describe("redactLedger", () => {
  it("DM and owner see the ledger, anyone else gets an empty one", () => {
    expect(redactLedger(existing, { isDM: true, isOwner: false }).ledger).toEqual([entry]);
    expect(redactLedger(existing, { isDM: false, isOwner: true }).ledger).toEqual([entry]);

    const other = redactLedger(existing, { isDM: false, isOwner: false });

    expect(other.ledger).toEqual([]);
    expect(other.talents).toEqual({ feat: 1 });
  });
});

const downtime = { ailments: [], lastPeriod: { id: "p1", at: "2026-01-01T00:00:00.000Z", days: 7, before: { ailments: [] }, after: { ailmentIds: [] }, summary: { healed: 0, ailments: [] } } };

describe("redactLedger downtime", () => {
  it("hides downtime from anyone but DM and owner", () => {
    const withDowntime = { ...existing, downtime };

    const other = redactLedger(withDowntime, { isDM: false, isOwner: false });

    expect("downtime" in other).toBe(false);
    expect(other.ledger).toEqual([]);
    expect(redactLedger(withDowntime, { isDM: false, isOwner: true })).toBe(withDowntime);
    expect(redactLedger(withDowntime, { isDM: true, isOwner: false })).toBe(withDowntime);
  });
});

describe("preserveServerOwned downtime", () => {
  it("keeps the stored downtime and ignores the incoming one", () => {
    const incoming = { ...DEFAULT_CHARACTERISTICS, downtime: { ailments: [], training: { kind: "skill" as const, key: "charm", discount: 50 } } };

    expect(preserveServerOwned({ ...existing, downtime }, incoming).downtime).toEqual(downtime);
    expect("downtime" in preserveServerOwned(existing, incoming)).toBe(false);
  });
});

describe("preserveServerOwned", () => {
  it("keeps advances, skillAdvances, talents and ledger from the stored value, takes the rest from the input", () => {
    const incoming = { ...DEFAULT_CHARACTERISTICS, fate: 3, advances: { ...DEFAULT_CHARACTERISTICS.advances, ws: 30 }, skillAdvances: { x: 9 }, talents: { cheat: 5 }, ledger: [], spentArchived: 0 };

    const result = preserveServerOwned(existing, incoming);

    expect(result).toMatchObject({ fate: 3, advances: existing.advances, skillAdvances: existing.skillAdvances, talents: existing.talents, ledger: existing.ledger, spentArchived: 70 });
  });

  it("a player cannot set, change or drop the career through a patch", () => {
    const career = { careerId: "c1", tier: 2 as const, ticks: ["skill:athletics"] };

    const forged = { ...DEFAULT_CHARACTERISTICS, career: { careerId: "c1", tier: 4 as const, ticks: [] } };

    expect(preserveServerOwned({ ...existing, career }, forged).career).toEqual(career);
    expect(preserveServerOwned({ ...existing, career }, DEFAULT_CHARACTERISTICS).career).toEqual(career);
    expect(preserveServerOwned(existing, forged).career).toBeUndefined();
  });
});
