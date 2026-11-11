import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));

import { systemServerOf } from "@/lib/server/systems/registry";

describe("systemServerOf", () => {
  it("returns the server of a known key and throws for an unknown one", () => {
    expect(systemServerOf({ system: { key: "wfrp" } }).ai).toBeDefined();
    expect(() => systemServerOf({ system: { key: "nope" } })).toThrow("Unknown rule system: nope");
    expect(() => systemServerOf({ system: { key: "toString" } })).toThrow("Unknown rule system");
  });
});
