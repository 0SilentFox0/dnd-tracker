import { describe, expect, it } from "vitest";

import { hasUnread, matchesRead, unreadOfTypes } from "../select";

import type { PlayerNotification } from "@/types/notifications";

const n = (type: PlayerNotification["type"], refId: string): PlayerNotification => ({ id: `${type}-${refId}`, type, refId, href: "/h", createdAt: "2026-10-28T00:00:00.000Z" });

describe("matchesRead", () => {
  it("matches by type", () => expect(matchesRead(n("item", "a1"), { types: ["item"] })).toBe(true));

  it("matches by refId", () => expect(matchesRead(n("item", "a1"), { refIds: ["a1"] })).toBe(true));

  it("requires both filters when both are given", () => {
    expect(matchesRead(n("item", "a1"), { types: ["item"], refIds: ["a2"] })).toBe(false);
    expect(matchesRead(n("item", "a1"), { types: ["item"], refIds: ["a1"] })).toBe(true);
  });

  it("matches nothing for an empty filter", () => expect(matchesRead(n("item", "a1"), {})).toBe(false));
});

describe("unreadOfTypes / hasUnread", () => {
  it("filters by type", () => expect(unreadOfTypes([n("item", "a1"), n("level", "c:4")], ["item"])).toEqual([n("item", "a1")]));

  it("handles an undefined list", () => {
    expect(unreadOfTypes(undefined, ["item"])).toEqual([]);
    expect(hasUnread(undefined, ["item"])).toBe(false);
  });

  it("reports unread presence", () => {
    expect(hasUnread([n("spell", "s1")], ["spell"])).toBe(true);
    expect(hasUnread([n("spell", "s1")], ["item"])).toBe(false);
  });
});
