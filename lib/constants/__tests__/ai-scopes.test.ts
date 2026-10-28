import { describe, expect, it } from "vitest";

import { hasScope } from "@/lib/constants/ai";

describe("hasScope", () => {
  it("content:write включає content:read", () => {
    expect(hasScope(["content:write"], "content:read")).toBe(true);
    expect(hasScope(["content:read"], "content:write")).toBe(false);
  });

  it("ai не дає прав на контент і навпаки", () => {
    expect(hasScope(["ai"], "content:read")).toBe(false);
    expect(hasScope(["content:write"], "ai")).toBe(false);
    expect(hasScope(["ai"], "ai")).toBe(true);
  });
});
