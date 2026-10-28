import { describe, expect, it } from "vitest";

import { applyStashAction, StashError } from "@/lib/utils/inventory/stash-actions";
import type { StashState } from "@/types/inventory";

const base = (over: Partial<StashState> = {}): StashState => ({ equipped: { weapon: "ls+ft" }, stash: ["ring", "wand"], items: [], purse: { gp: 0, sp: 0, cp: 0 }, attuned: [], ...over });

const items = (over: Partial<{ enabled: boolean; limit: number; attunable: boolean }> = {}) => ({ enabled: true, limit: 3, attunable: true, ...over });

const ctx = { newItemId: "n1" };

describe("grant with a plan", () => {
  it("composed ref goes to the stash with the composed name in the log", () => {
    const r = applyStashAction(base(), { action: "grant", artifactId: "ft", baseId: "gs" }, { ...ctx, grant: { kind: "stash", ref: "gs+ft", name: "Flame Tongue Greatsword" } });

    expect(r.ok && r.state.stash).toEqual(["ring", "wand", "gs+ft"]);
    expect(r.ok && r.log.delta).toEqual({ artifactId: "gs+ft", artifactName: "Flame Tongue Greatsword" });
  });

  it("the same ref already in the stash → ALREADY_IN_STASH", () => {
    expect(applyStashAction(base(), { action: "grant", artifactId: "ring" }, { ...ctx, grant: { kind: "stash", ref: "ring", name: "Ring" } })).toEqual({ ok: false, error: StashError.ALREADY_IN_STASH });
  });

  it("consumable adds a SpecialItem or tops up the existing one", () => {
    const plan = { kind: "consumable" as const, artifactId: "pot", name: "Potion of Healing", quantity: 2 };

    const first = applyStashAction(base(), { action: "grant", artifactId: "pot", quantity: 2 }, { ...ctx, grant: plan });

    expect(first.ok && first.state.items).toEqual([{ id: "n1", name: "Potion of Healing", quantity: 2, consumable: true, artifactId: "pot" }]);
    expect(first.ok && first.log).toEqual({ kind: "item_add", delta: { item: "Potion of Healing", qty: 2, artifactId: "pot" }, note: null });

    const again = first.ok ? applyStashAction(first.state, { action: "grant", artifactId: "pot", quantity: 2 }, { ...ctx, newItemId: "n2", grant: plan }) : first;

    expect(again.ok && again.state.items).toEqual([{ id: "n1", name: "Potion of Healing", quantity: 4, consumable: true, artifactId: "pot" }]);
  });

  it("editItem keeps the artifact link", () => {
    const s = base({ items: [{ id: "p", name: "Potion", quantity: 2, consumable: true, artifactId: "pot" }] });

    const r = applyStashAction(s, { action: "editItem", itemId: "p", name: "Зілля", quantity: 3, consumable: true }, ctx);

    expect(r.ok && r.state.items[0]).toEqual({ id: "p", name: "Зілля", quantity: 3, consumable: true, artifactId: "pot" });
  });
});

describe("attunement", () => {
  it("attune: limit, not required, not held, disabled, already", () => {
    const ok = applyStashAction(base(), { action: "attune", ref: "ls+ft" }, { ...ctx, items: items(), name: "Flame Tongue Longsword" });

    expect(ok.ok && ok.state.attuned).toEqual(["ls+ft"]);
    expect(ok.ok && ok.log).toEqual({ kind: "artifact_attune", delta: { artifactId: "ls+ft", artifactName: "Flame Tongue Longsword" }, note: null });
    expect(applyStashAction(base({ attuned: ["a", "b", "c"] }), { action: "attune", ref: "ring" }, { ...ctx, items: items() })).toEqual({ ok: false, error: StashError.ATTUNEMENT_LIMIT });
    expect(applyStashAction(base(), { action: "attune", ref: "wand" }, { ...ctx, items: items({ attunable: false }) })).toEqual({ ok: false, error: StashError.ATTUNEMENT_NOT_REQUIRED });
    expect(applyStashAction(base(), { action: "attune", ref: "boots" }, { ...ctx, items: items() })).toEqual({ ok: false, error: StashError.ITEM_NOT_HELD });
    expect(applyStashAction(base(), { action: "attune", ref: "ring" }, { ...ctx, items: items({ enabled: false }) })).toEqual({ ok: false, error: StashError.ITEMS_DISABLED });
    expect(applyStashAction(base(), { action: "attune", ref: "ring" }, ctx)).toEqual({ ok: false, error: StashError.ITEMS_DISABLED });
    expect(applyStashAction(base({ attuned: ["ring"] }), { action: "attune", ref: "ring" }, { ...ctx, items: items() })).toEqual({ ok: false, error: StashError.ALREADY_ATTUNED });
  });

  it("unattune", () => {
    const r = applyStashAction(base({ attuned: ["ring"] }), { action: "unattune", ref: "ring" }, { ...ctx, items: items() });

    expect(r.ok && r.state.attuned).toEqual([]);
    expect(applyStashAction(base(), { action: "unattune", ref: "ring" }, { ...ctx, items: items() })).toEqual({ ok: false, error: StashError.ITEM_NOT_ATTUNED });
  });

  it("stash and revoke drop the attunement unless the same ref is still worn", () => {
    const stashed = applyStashAction(base({ attuned: ["ls+ft"] }), { action: "stash", slot: "weapon" }, ctx);

    expect(stashed.ok && stashed.state.attuned).toEqual([]);

    const twin = applyStashAction(base({ equipped: { weapon: "dg", shield: "dg" }, stash: [], attuned: ["dg"] }), { action: "stash", slot: "weapon" }, ctx);

    expect(twin.ok && twin.state.attuned).toEqual(["dg"]);

    const revoked = applyStashAction(base({ attuned: ["ring"] }), { action: "revoke", artifactId: "ring" }, ctx);

    expect(revoked.ok && revoked.state.attuned).toEqual([]);
  });

  it("stash of a duplicate already in the stash → ALREADY_IN_STASH; no attuned key when the state had none", () => {
    const s = { ...base({ equipped: { weapon: "dg", shield: "dg" }, stash: ["dg"] }) };

    expect(applyStashAction(s, { action: "stash", slot: "weapon" }, ctx)).toEqual({ ok: false, error: StashError.ALREADY_IN_STASH });

    const { attuned: _a, ...legacy } = base();

    const r = applyStashAction(legacy, { action: "stash", slot: "weapon" }, ctx);

    expect(r.ok && r.state).not.toHaveProperty("attuned");
  });
});

describe("fix-wave guards", () => {
  const owned = base({ items: [{ id: "p", name: "Potion", quantity: 2, consumable: true, artifactId: "pot" }] });

  it("player editItem cannot raise a linked consumable: lowering keeps the link, raising drops it", () => {
    const lower = applyStashAction(owned, { action: "editItem", itemId: "p", name: "Potion", quantity: 1, consumable: true }, { ...ctx, isDM: false });

    const raise = applyStashAction(owned, { action: "editItem", itemId: "p", name: "Potion", quantity: 9999, consumable: true }, { ...ctx, isDM: false });

    const dm = applyStashAction(owned, { action: "editItem", itemId: "p", name: "Potion", quantity: 9, consumable: true }, { ...ctx, isDM: true });

    expect(lower.ok && lower.state.items[0].artifactId).toBe("pot");
    expect(raise.ok && raise.state.items[0].artifactId).toBeUndefined();
    expect(dm.ok && dm.state.items[0].artifactId).toBe("pot");
  });

  it("equip swapping an occupant that is already in the stash → ALREADY_IN_STASH", () => {
    const s = base({ equipped: { weapon: "dg" }, stash: ["dg", "ls"] });

    expect(applyStashAction(s, { action: "equip", artifactId: "ls" }, { ...ctx, artifactSlotType: "weapon" })).toEqual({ ok: false, error: StashError.ALREADY_IN_STASH });
  });
});
