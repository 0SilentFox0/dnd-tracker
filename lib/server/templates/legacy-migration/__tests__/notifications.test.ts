import { describe, expect, it } from "vitest";

import { collidingNotifications } from "@/lib/server/templates/legacy-migration/notifications";

const row = (id: string, refId: string, userId = "u", type = "spell") => ({ id, userId, type, refId });

const map = new Map([["l1", "b1"], ["l2", "b1"], ["l3", "b3"]]);

describe("collidingNotifications", () => {
  it("drops nothing without collisions", () => {
    expect(collidingNotifications({ rows: [row("n1", "l1"), row("n3", "l3")], idMap: map, existing: [] })).toEqual([]);
  });

  it("drops a row whose new key already exists elsewhere", () => {
    expect(collidingNotifications({ rows: [row("n1", "l1")], idMap: map, existing: [{ userId: "u", type: "spell", refId: "b1" }] }).map((r) => r.id)).toEqual(["n1"]);
  });

  it("ignores other users and types", () => {
    expect(collidingNotifications({ rows: [row("n1", "l1")], idMap: map, existing: [{ userId: "x", type: "spell", refId: "b1" }, { userId: "u", type: "item", refId: "b1" }] })).toEqual([]);
  });

  it("keeps the first of two rows that map to the same key", () => {
    expect(collidingNotifications({ rows: [row("n1", "l1"), row("n2", "l2")], idMap: map, existing: [] }).map((r) => r.id)).toEqual(["n2"]);
  });

  it("an unchanged row keeps its key and beats a remapped one", () => {
    expect(collidingNotifications({ rows: [row("n1", "l1"), row("n2", "b1")], idMap: map, existing: [] }).map((r) => r.id)).toEqual(["n1"]);
  });
});
