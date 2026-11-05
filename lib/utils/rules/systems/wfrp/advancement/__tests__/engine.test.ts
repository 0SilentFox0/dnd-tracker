import { describe, expect, it } from "vitest";

import { type Characteristics,DEFAULT_CHARACTERISTICS } from "../../characteristics/keys";
import { advanceCost } from "../cost";
import { DEFAULT_ADVANCEMENT_RULES as RULES } from "../defaults";
import { planPurchase, type PurchaseInput } from "../plan";
import { availableXp, talentGroups } from "../talent-groups";
import { planUndo } from "../undo";

import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { FeatData } from "@/types/choices";

const base = (extra: Partial<Characteristics> = {}): Characteristics => ({ ...DEFAULT_CHARACTERISTICS, ...extra });

const buy = (over: Partial<PurchaseInput> & Pick<PurchaseInput, "request">) =>
  planPurchase({ characteristics: base(), available: 1000, rules: RULES, now: "2026-11-05T00:00:00.000Z", id: "e1", ...over });

const talent = { id: "t1", xpCost: 100, maxRank: 3 };

describe("advanceCost", () => {
  it("uses bracket upper bounds inclusive", () => {
    expect(advanceCost("characteristic", 0, RULES)).toBe(25);
    expect(advanceCost("characteristic", 5, RULES)).toBe(25);
    expect(advanceCost("characteristic", 6, RULES)).toBe(30);
    expect(advanceCost("skill", 30 - 1, RULES)).toBe(60);
  });

  it("returns null at the limit", () => {
    expect(advanceCost("characteristic", 40, RULES)).toBeNull();
    expect(advanceCost("skill", 30, RULES)).toBeNull();
  });
});

describe("planPurchase", () => {
  it("buys a characteristic advance and records the ledger", () => {
    const r = buy({ request: { kind: "characteristic", key: "ws" } });

    expect(r.ok && r.next.advances.ws).toBe(1);
    expect(r.ok && r.next.ledger).toEqual([{ id: "e1", at: "2026-11-05T00:00:00.000Z", kind: "characteristic", key: "ws", from: 0, to: 1, cost: 25 }]);
  });

  it("buys plain and specialised skills", () => {
    const a = buy({ request: { kind: "skill", key: "athletics" } });

    const b = buy({ request: { kind: "skill", key: "melee:basic" } });

    expect(a.ok && a.next.skillAdvances).toEqual({ athletics: 1 });
    expect(b.ok && b.next.skillAdvances).toEqual({ "melee:basic": 1 });
    expect(buy({ request: { kind: "skill", key: "Bad Key" } })).toEqual({ ok: false, error: "UNKNOWN_KEY" });
  });

  it("prices talents as xpCost x next rank and caps at maxRank", () => {
    const r1 = buy({ request: { kind: "talent", key: "t1" }, talent });

    expect(r1.ok && r1.entry.cost).toBe(100);

    const r2 = buy({ request: { kind: "talent", key: "t1" }, talent, characteristics: base({ talents: { t1: 1 } }) });

    expect(r2.ok && [r2.entry.cost, r2.next.talents.t1]).toEqual([200, 2]);
    expect(buy({ request: { kind: "talent", key: "t1" }, talent, characteristics: base({ talents: { t1: 3 } }) })).toEqual({ ok: false, error: "MAX_RANK" });
    expect(buy({ request: { kind: "talent", key: "t1" }, talent: { ...talent, maxRank: null }, characteristics: base({ talents: { t1: 1 } }) })).toEqual({ ok: false, error: "MAX_RANK" });
  });

  it("rejects talents without a price or definition", () => {
    expect(buy({ request: { kind: "talent", key: "t1" }, talent: { ...talent, xpCost: null } })).toEqual({ ok: false, error: "TALENT_NO_COST" });
    expect(buy({ request: { kind: "talent", key: "t1" } })).toEqual({ ok: false, error: "UNKNOWN_TALENT" });
  });

  it("charges exactly the price and refuses 1 XP below", () => {
    expect(buy({ request: { kind: "characteristic", key: "ws" }, available: 25 }).ok).toBe(true);
    expect(buy({ request: { kind: "characteristic", key: "ws" }, available: 24 })).toEqual({ ok: false, error: "INSUFFICIENT_XP" });
  });

  it("rejects unknown characteristic and limit", () => {
    expect(buy({ request: { kind: "characteristic", key: "zz" } })).toEqual({ ok: false, error: "UNKNOWN_KEY" });
    expect(buy({ request: { kind: "characteristic", key: "ws" }, characteristics: base({ advances: { ...DEFAULT_CHARACTERISTICS.advances, ws: 40 } }) })).toEqual({ ok: false, error: "AT_LIMIT" });
  });

  it("trims the oldest ledger entry beyond 200", () => {
    const ledger = Array.from({ length: 200 }, (_, i) => ({ id: `o${i}`, at: "x", kind: "skill" as const, key: "athletics", from: 0, to: 1, cost: 10 }));

    const r = buy({ request: { kind: "characteristic", key: "ws" }, characteristics: base({ ledger }) });

    expect(r.ok && r.next.ledger).toHaveLength(200);
    expect(r.ok && [r.next.ledger[0].id, r.next.ledger[199].id]).toEqual(["o1", "e1"]);
  });

  it("does not refund XP for entries trimmed beyond 200", () => {
    const ledger = Array.from({ length: 200 }, (_, i) => ({ id: `o${i}`, at: "x", kind: "skill" as const, key: "athletics", from: 0, to: 1, cost: 10 }));

    const characteristics = base({ ledger });

    const before = availableXp(5000, characteristics);

    const r = buy({ request: { kind: "characteristic", key: "ws" }, characteristics });

    expect(r.ok && r.next.spentArchived).toBe(10);
    expect(r.ok && before - availableXp(5000, r.next)).toBe(25);
  });

  it("does not mutate the input", () => {
    const c = base();

    buy({ request: { kind: "characteristic", key: "ws" }, characteristics: c });

    expect(c).toEqual(DEFAULT_CHARACTERISTICS);
  });
});

describe("planUndo", () => {
  const bought = (request: PurchaseInput["request"], characteristics = base(), t?: typeof talent) => {
    const r = buy({ request, characteristics, talent: t });

    if (!r.ok) throw new Error(r.error);

    return r.next;
  };

  it.each([
    [{ kind: "characteristic", key: "ws" } as const],
    [{ kind: "skill", key: "athletics" } as const],
    [{ kind: "talent", key: "t1" } as const],
  ])("reverts %j to the original state", (request) => {
    const next = bought(request, base(), talent);

    const r = planUndo(next);

    expect(r.ok && r.next).toEqual(DEFAULT_CHARACTERISTICS);
  });

  it("lowers a rank above 1 and keeps the key", () => {
    const r = planUndo(bought({ kind: "talent", key: "t1" }, base({ talents: { t1: 1 } }), talent));

    expect(r.ok && r.next.talents).toEqual({ t1: 1 });
  });

  it("LEDGER_EMPTY and LEDGER_STALE", () => {
    expect(planUndo(base())).toEqual({ ok: false, error: "LEDGER_EMPTY" });

    const next = bought({ kind: "characteristic", key: "ws" });

    const edited = { ...next, advances: { ...next.advances, ws: 5 } };

    expect(planUndo(edited)).toEqual({ ok: false, error: "LEDGER_STALE" });
  });
});

describe("availableXp", () => {
  it("subtracts the ledger and never goes negative", () => {
    const c = base({ ledger: [{ id: "a", at: "x", kind: "skill", key: "athletics", from: 0, to: 1, cost: 40 }] });

    expect(availableXp(100, c)).toBe(60);
    expect(availableXp(10, c)).toBe(0);
  });
});

describe("talentGroups", () => {
  const feat = { id: "t1", name: "Hardy", icon: null, abilities: [{ id: "a", name: "A", trigger: { event: "passive" }, effects: [] }] } as unknown as FeatData;

  it("repeats the group per rank with unique ids and skips unknown feats", () => {
    const groups = talentGroups({ t1: 3, gone: 2 }, { t1: feat });

    expect(groups).toHaveLength(3);
    expect(new Set(groups.map((g) => g.abilities[0].id)).size).toBe(3);
    expect(groups[0].abilities[0].id).toBe("talent:t1#1.a");
    expect(groups[0].source).toEqual({ type: "feat", id: "t1", name: "Hardy", icon: null });
  });

  it("is empty for no talents", () => {
    expect(talentGroups({}, { t1: feat })).toEqual([]);
  });
});

describe("system hook", () => {
  it("exists for wfrp only", () => {
    expect(ruleSystemOf({ system: { key: "wfrp" } }).advancement).toBeDefined();
    expect(ruleSystemOf({ system: { key: "dnd5e" } }).advancement).toBeUndefined();
    expect(ruleSystemOf({ system: { key: "homm" } }).advancement).toBeUndefined();
  });
});
