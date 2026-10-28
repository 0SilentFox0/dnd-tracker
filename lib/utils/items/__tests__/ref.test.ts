import { describe, expect, it } from "vitest";

import { isComposedRef, itemRef, parseItemRef, refArtifactIds } from "@/lib/utils/items/ref";

describe("item refs", () => {
  it("plain and composed refs", () => {
    expect(itemRef("cl1")).toBe("cl1");
    expect(itemRef("cl1", "cp2")).toBe("cl1+cp2");
    expect(parseItemRef("cl1+cp2")).toEqual({ baseId: "cl1", propertyId: "cp2", param: null });
    expect(parseItemRef("ring-a")).toEqual({ baseId: "ring-a", propertyId: null, param: null });
    expect(refArtifactIds("cl1+cp2")).toEqual(["cl1", "cp2"]);
    expect(isComposedRef("cl1+cp2")).toBe(true);
    expect(isComposedRef("cl1")).toBe(false);
  });

  it("rejects malformed refs", () => {
    expect(itemRef("cl1", "cp2", "fire")).toBe("cl1+cp2~fire");
    expect(itemRef("ring", null, "cold")).toBe("ring~cold");
    expect(parseItemRef("cl1+cp2~fire")).toEqual({ baseId: "cl1", propertyId: "cp2", param: "fire" });
    expect(parseItemRef("ring~cold")).toEqual({ baseId: "ring", propertyId: null, param: "cold" });
    expect(refArtifactIds("cl1+cp2~fire")).toEqual(["cl1", "cp2"]);
  });

  it("rejects malformed refs", () => {
    for (const bad of ["", "a+b+c", "+b", "a+", "a b", "x".repeat(65), "a~", "a+b~x~y", "a~bad key"]) {
      expect(parseItemRef(bad), bad).toBeNull();
      expect(refArtifactIds(bad), bad).toEqual([]);
    }
  });
});
