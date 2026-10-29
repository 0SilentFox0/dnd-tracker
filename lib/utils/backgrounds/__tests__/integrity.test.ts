import { describe, expect, it } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { backgroundReferenceError } from "@/lib/utils/backgrounds/integrity";

describe("backgroundReferenceError", () => {
  it("rejects a non-origin feat", () => {
    expect(backgroundReferenceError({ originFeatId: "f1" }, [{ id: "f1", type: "general" }], new Set())).toBe(API_ERRORS.BACKGROUND_ORIGIN_FEAT_INVALID);
  });

  it("rejects an unknown spell", () => {
    const choices = [{ id: "c", spellId: "s1" }];

    expect(backgroundReferenceError({ choices }, [], new Set())).toBe(API_ERRORS.BACKGROUND_SPELL_UNKNOWN);
  });

  it("accepts valid references", () => {
    expect(backgroundReferenceError({ originFeatId: "f1" }, [{ id: "f1", type: "origin" }], new Set())).toBeNull();
  });
});
