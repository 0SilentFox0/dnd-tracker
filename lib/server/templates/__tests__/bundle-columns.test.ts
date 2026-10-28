import { describe, expect, it } from "vitest";

import { BUNDLE_TABLES } from "../bundle";

describe("bundle: class table", () => {
  it("classes carry the columns column", () => {
    expect(BUNDLE_TABLES.find((t) => t.key === "classes")?.columns).toContain("columns");
  });
});
