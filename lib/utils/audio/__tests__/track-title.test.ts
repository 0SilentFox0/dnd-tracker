import { describe, expect, it } from "vitest";

import { normalizeTrackTitle } from "../track-title";

describe("normalizeTrackTitle", () => {
  it("обрізає пробіли; порожня, скасована чи та сама — null", () => {
    expect(normalizeTrackTitle("  Буря ", "Епік")).toBe("Буря");
    expect(normalizeTrackTitle("   ", "Епік")).toBeNull();
    expect(normalizeTrackTitle(null, "Епік")).toBeNull();
    expect(normalizeTrackTitle(" Епік", "Епік")).toBeNull();
  });
});
