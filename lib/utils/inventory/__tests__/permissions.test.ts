import { describe, expect, it } from "vitest";

import { canStashAction } from "@/lib/utils/inventory/permissions";

const owner = { isDM: false, isOwner: true, pending: false };

describe("canStashAction", () => {
  it.each(["spend", "gain", "addItem", "editItem", "useItem", "removeItem", "stash", "equip"] as const)("owner may %s", (a) => {
    expect(canStashAction(a, owner)).toBe(true);
  });

  it.each(["grant", "revoke", "setMoney"] as const)("owner may not %s", (a) => {
    expect(canStashAction(a, owner)).toBe(false);
  });

  it("stranger may nothing, DM everything", () => {
    expect(canStashAction("spend", { isDM: false, isOwner: false, pending: false })).toBe(false);
    expect(canStashAction("grant", { isDM: true, isOwner: false, pending: true })).toBe(true);
  });

  it("owner of a pending draft may nothing", () => {
    expect(canStashAction("spend", { ...owner, pending: true })).toBe(false);
  });
});
