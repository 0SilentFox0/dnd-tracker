import { describe, expect, it } from "vitest";

import { isComposedRef, itemRef, parseItemRef, refArtifactIds } from "@/lib/utils/items/ref";

describe("item refs", () => {
  it("plain and composed refs", () => {
    expect(itemRef("cl1")).toBe("cl1");
    expect(itemRef("cl1", "cp2")).toBe("cl1+cp2");
    expect(parseItemRef("cl1+cp2")).toEqual({ baseId: "cl1", propertyId: "cp2" });
    expect(parseItemRef("ring-a")).toEqual({ baseId: "ring-a", propertyId: null });
    expect(refArtifactIds("cl1+cp2")).toEqual(["cl1", "cp2"]);
    expect(isComposedRef("cl1+cp2")).toBe(true);
    expect(isComposedRef("cl1")).toBe(false);
  });

  it("rejects malformed refs", () => {
    for (const bad of ["", "a+b+c", "+b", "a+", "a b", "x".repeat(65)]) {
      expect(parseItemRef(bad), bad).toBeNull();
      expect(refArtifactIds(bad), bad).toEqual([]);
    }
  });
});
