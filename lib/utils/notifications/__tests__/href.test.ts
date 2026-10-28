import { describe, expect, it } from "vitest";

import { notificationHref } from "../href";

describe("notificationHref", () => {
  it("links level to the character sheet", () => {
    expect(notificationHref("c1", "level", "x:4")).toBe("/campaigns/c1/character");
  });

  it("links item to the items tab", () => {
    expect(notificationHref("c1", "item", "a1")).toBe("/campaigns/c1/character?tab=items");
  });

  it("links spell to the magic tab", () => {
    expect(notificationHref("c1", "spell", "s1")).toBe("/campaigns/c1/character?tab=magic");
  });

  it("links acquaintance to the focused entry with an encoded refId", () => {
    expect(notificationHref("c1", "acquaintance", "a1")).toBe("/campaigns/c1/acquaintances?focus=a1");
    expect(notificationHref("c1", "acquaintance", "a/b c")).toBe("/campaigns/c1/acquaintances?focus=a%2Fb%20c");
  });
});
