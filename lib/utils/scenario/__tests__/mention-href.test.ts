import { describe, expect, it } from "vitest";

import { mentionHref } from "../mention-href";

describe("mentionHref", () => {
  it("marker веде на карту світу ДМ", () => expect(mentionHref("c1", "marker", "m1")).toBe("/campaigns/c1/dm/world?marker=m1"));

  it("battle і розділи юнітів", () => {
    expect(mentionHref("c1", "battle", "b1")).toBe("/campaigns/c1/battles/b1");
    expect(mentionHref("c1", "unit", "u1")).toBe("/campaigns/c1/dm/units/u1");
  });
});
