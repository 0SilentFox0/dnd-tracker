import { describe, expect, it } from "vitest";

import { BUNDLE_TABLES, emptyBundle } from "@/lib/server/templates/bundle";
import { baselineFromBundle, rowHash, rulesHashes, settingsHash } from "@/lib/server/templates/sync/hash";
import { hashJson } from "@/lib/utils/battle/store/stable-json";
import { MECHANIC_REGISTRY } from "@/lib/utils/rules/registry";
import { parseRules } from "@/lib/utils/rules/schema";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

const spells = BUNDLE_TABLES.find((t) => t.key === "spells")!;

describe("sync hashes", () => {
  it("rowHash ignores columns outside the bundle", () => {
    const row = { id: "c" + "a".repeat(24), name: "Fireball" };

    expect(rowHash({ ...row, sourceId: "x", campaignId: "y" }, spells)).toBe(rowHash(row, spells));
  });

  it("feat rowHash ignores null xpCost/maxRank but reacts to values", () => {
    const feats = BUNDLE_TABLES.find((t) => t.key === "feats")!;

    const row = { id: "c" + "a".repeat(24), name: "Grappler", repeatable: false };

    expect(rowHash({ ...row, xpCost: null, maxRank: null }, feats)).toBe(rowHash(row, feats));
    expect(rowHash({ ...row, xpCost: 100, maxRank: null }, feats)).not.toBe(rowHash(row, feats));
  });

  it("artifact rowHash ignores null systemStats but reacts to values", () => {
    const artifacts = BUNDLE_TABLES.find((t) => t.key === "artifacts")!;

    expect(artifacts.columns).toContain("systemStats");

    const row = { id: "c" + "a".repeat(24), name: "Mail", slot: "armor" };

    expect(rowHash({ ...row, systemStats: null }, artifacts)).toBe(rowHash(row, artifacts));
    expect(rowHash({ ...row, systemStats: { type: "gear", weight: 1, price: 1, qualities: [] } }, artifacts)).not.toBe(rowHash(row, artifacts));
  });

  it("rowHash reacts to ingredients and componentFlags", () => {
    const row = { id: "c" + "a".repeat(24), name: "Revivify", ingredients: [], componentFlags: null };

    const diamond = { name: "Diamond", qty: 1, minGp: 300, consumed: true, focus: false };

    expect(spells.columns).toEqual(expect.arrayContaining(["ingredients", "componentFlags"]));
    expect(rowHash({ ...row, ingredients: [diamond] }, spells)).not.toBe(rowHash(row, spells));
    expect(rowHash({ ...row, componentFlags: { v: true, s: true, m: true } }, spells)).not.toBe(rowHash(row, spells));
  });

  it("rulesHashes covers every mechanic and treats {} as defaults", () => {
    const h = rulesHashes({});

    expect(Object.keys(h).sort()).toEqual(Object.keys(MECHANIC_REGISTRY).sort());
    expect(h.morale).toBe(hashJson(parseRules({}).morale));
  });

  it("rulesHashes does not treat system as a mechanic", () => {
    expect(Object.keys(rulesHashes(WFRP_RULES))).not.toContain("system");
  });

  it("settingsHash depends only on the four settings", () => {
    const s = { maxLevel: 20, xpMultiplier: 2.5, allowPlayerEdit: true, friendlyFire: false };

    expect(settingsHash({ ...s })).toBe(settingsHash(s));
    expect(settingsHash({ ...s, maxLevel: 10 })).not.toBe(settingsHash(s));
  });

  it("baselineFromBundle keeps table hashes and adds rules/settings", () => {
    const b = emptyBundle();

    const base = baselineFromBundle(b, { spells: { a: "h1" } });

    expect(base.tables).toEqual({ spells: { a: "h1" } });
    expect(base.rules).toEqual(rulesHashes(b.rules));
    expect(base.settings).toBe(settingsHash(b.settings));
  });
});
