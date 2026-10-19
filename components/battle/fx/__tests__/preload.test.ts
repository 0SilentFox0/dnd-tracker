import { describe, expect, it, vi } from "vitest";

vi.mock("../auras/canvas/AuraCanvas", () => {
  throw new Error("ChunkLoadError");
});
vi.mock("../frames/ImpactFrame", () => ({}));

import { preloadFx } from "../preload";

describe("preloadFx", () => {
  it("a failed chunk load resolves quietly instead of an unhandled rejection", async () => {
    await expect(preloadFx()).resolves.toBeUndefined();
  });
});
