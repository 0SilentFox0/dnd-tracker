import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/battle/fx/auras/AuraCanvas", () => {
  throw new Error("ChunkLoadError");
});
vi.mock("@/components/battle/fx/frames/ImpactFrame", () => ({}));

import { preloadFx } from "@/components/battle/fx/preload";

describe("preloadFx", () => {
  it("a failed chunk load resolves quietly instead of an unhandled rejection", async () => {
    await expect(preloadFx()).resolves.toBeUndefined();
  });
});
