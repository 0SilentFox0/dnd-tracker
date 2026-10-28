// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { pickActiveSection } from "@/lib/hooks/scenario/useActiveSection";

describe("pickActiveSection", () => {
  it("останній розділ, що пройшов лінію під шапкою", () => {
    expect(pickActiveSection([{ id: "a", top: -400 }, { id: "b", top: 100 }, { id: "c", top: 900 }], 150)).toBe("b");
  });

  it("на початку сторінки — перший", () => {
    expect(pickActiveSection([{ id: "a", top: 300 }, { id: "b", top: 900 }], 150)).toBe("a");
  });

  it("порожньо — null", () => {
    expect(pickActiveSection([], 150)).toBeNull();
  });
});
