import { describe, expect, it } from "vitest";

import { applyStashAction, StashError } from "@/lib/utils/inventory/stash-actions";
import type { StashState } from "@/types/inventory";

const base = (): StashState => ({
  equipped: { weapon: "sword" },
  stash: ["ring-a"],
  items: [{ id: "p1", name: "Зілля", quantity: 2, consumable: true }],
  purse: { gp: 10, sp: 0, cp: 0 },
});

const ctx = { newItemId: "new-1" };

describe("applyStashAction", () => {
  it("spend deducts and logs negative delta with note", () => {
    const r = applyStashAction(base(), { action: "spend", amount: 3, coin: "gp", note: "човен" }, ctx);

    expect(r.ok && r.state.purse).toEqual({ gp: 7, sp: 0, cp: 0 });
    expect(r.ok && r.log).toEqual({ kind: "money_spend", delta: { gp: -3, sp: 0, cp: 0 }, note: "човен" });
  });

  it("spend over balance fails", () => {
    expect(applyStashAction(base(), { action: "spend", amount: 11, coin: "gp", note: "x" }, ctx)).toEqual({
      ok: false,
      error: StashError.NOT_ENOUGH_MONEY,
    });
  });

  it("useItem decrements and removes at zero", () => {
    const once = applyStashAction(base(), { action: "useItem", itemId: "p1" }, ctx);

    expect(once.ok && once.state.items[0].quantity).toBe(1);

    const twice = once.ok ? applyStashAction(once.state, { action: "useItem", itemId: "p1" }, ctx) : once;

    expect(twice.ok && twice.state.items).toEqual([]);
    expect(twice.ok && twice.log.kind).toBe("item_use");
  });

  it("addItem uses ctx.newItemId", () => {
    const r = applyStashAction(base(), { action: "addItem", name: "Ключ", quantity: 1, consumable: false }, ctx);

    expect(r.ok && r.state.items.at(-1)).toEqual({ id: "new-1", name: "Ключ", quantity: 1, consumable: false });
  });

  it("stash moves equipped slot to stash", () => {
    const r = applyStashAction(base(), { action: "stash", slot: "weapon" }, ctx);

    expect(r.ok && r.state.equipped).toEqual({});
    expect(r.ok && r.state.stash).toEqual(["ring-a", "sword"]);
  });

  it("equip puts artifact in its grid cell and swaps occupant into stash", () => {
    const s = { ...base(), equipped: { ring1: "ring-old" } };

    const r = applyStashAction(s, { action: "equip", artifactId: "ring-a" }, { ...ctx, artifactSlotType: "ring" });

    expect(r.ok && r.state.equipped).toEqual({ ring1: "ring-a" });
    expect(r.ok && r.state.stash).toEqual(["ring-old"]);
  });

  it("equip of ITEM-slot artifact fails", () => {
    expect(applyStashAction(base(), { action: "equip", artifactId: "ring-a" }, { ...ctx, artifactSlotType: "item" })).toEqual({
      ok: false,
      error: StashError.NO_SLOT_FOR_ARTIFACT,
    });
  });

  it("grant appends, revoke removes", () => {
    const g = applyStashAction(base(), { action: "grant", artifactId: "amulet" }, ctx);

    expect(g.ok && g.state.stash).toEqual(["ring-a", "amulet"]);

    const r = applyStashAction(base(), { action: "revoke", artifactId: "ring-a" }, ctx);

    expect(r.ok && r.state.stash).toEqual([]);
  });
});
