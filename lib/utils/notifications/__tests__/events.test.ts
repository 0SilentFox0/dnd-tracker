import { describe, expect, it } from "vitest";

import { inventoryNotificationEvents, levelNotificationEvents, spellNotificationEvents } from "../events";

describe("inventoryNotificationEvents", () => {
  it("emits an item event for artifact_grant", () => {
    expect(inventoryNotificationEvents([{ characterId: "c", kind: "artifact_grant", delta: { artifactId: "a1" } }])).toEqual([
      { characterId: "c", type: "item", refId: "a1" },
    ]);
  });

  it("emits an item event for the receiver of artifact_transfer", () => {
    expect(
      inventoryNotificationEvents([{ characterId: "c", kind: "artifact_transfer", delta: { artifactId: "a1", fromCharacterId: "x" } }]),
    ).toEqual([{ characterId: "c", type: "item", refId: "a1" }]);
  });

  it("ignores the sender of artifact_transfer", () => {
    expect(
      inventoryNotificationEvents([{ characterId: "c", kind: "artifact_transfer", delta: { artifactId: "a1", toCharacterId: "x" } }]),
    ).toEqual([]);
  });

  it("ignores other kinds", () => {
    expect(
      inventoryNotificationEvents([
        { characterId: "c", kind: "artifact_equip", delta: { artifactId: "a1" } },
        { characterId: "c", kind: "item_add", delta: { artifactId: "a1" } },
        { characterId: "c", kind: "money_gain", delta: { artifactId: "a1" } },
      ]),
    ).toEqual([]);
  });

  it("ignores entries without a string artifactId", () => {
    expect(inventoryNotificationEvents([{ characterId: "c", kind: "artifact_grant", delta: { artifactId: 5 } }])).toEqual([]);
    expect(inventoryNotificationEvents([{ characterId: "c", kind: "artifact_grant", delta: {} }])).toEqual([]);
  });
});

describe("levelNotificationEvents", () => {
  it("emits an event on level increase", () => {
    expect(levelNotificationEvents("c", 3, 4)).toEqual([{ characterId: "c", type: "level", refId: "c:4" }]);
  });

  it("emits nothing when level is equal or lower", () => {
    expect(levelNotificationEvents("c", 4, 4)).toEqual([]);
    expect(levelNotificationEvents("c", 5, 4)).toEqual([]);
  });
});

describe("spellNotificationEvents", () => {
  it("emits only newly added spells", () => {
    expect(spellNotificationEvents("c", ["s1"], ["s1", "s2"])).toEqual([{ characterId: "c", type: "spell", refId: "s2" }]);
  });

  it("emits nothing when after is undefined", () => {
    expect(spellNotificationEvents("c", ["s1"], undefined)).toEqual([]);
  });

  it("treats a non-array before as empty", () => {
    for (const before of [null, {}]) {
      expect(spellNotificationEvents("c", before, ["s1"])).toEqual([{ characterId: "c", type: "spell", refId: "s1" }]);
    }
  });

  it("dedupes spells in after", () => {
    expect(spellNotificationEvents("c", [], ["s1", "s1"])).toEqual([{ characterId: "c", type: "spell", refId: "s1" }]);
  });
});
