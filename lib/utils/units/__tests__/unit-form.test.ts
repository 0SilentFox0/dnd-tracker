import { describe, expect, it } from "vitest";

import { buildUnitFormData, buildUnitUpdatePayload } from "@/lib/utils/units/unit-form";
import type { Unit } from "@/types/units";

const unit = { id: "u1", name: "Гоблін", race: " ", unitGroup: { name: "Гобліни" }, knownSpells: ["s1"], attacks: null, avatar: "" } as unknown as Unit;

describe("unit form", () => {
  it("falls back to the group name for race and normalizes arrays", () => {
    const f = buildUnitFormData(unit);

    expect(f.race).toBe("Гобліни");
    expect(f.attacks).toEqual([]);
    expect(f.avatar).toBeNull();
  });

  it("payload trims race to null and keeps saved knownSpells when the form has none", () => {
    const p = buildUnitUpdatePayload({ race: "  ", avatar: "" }, unit);

    expect(p.race).toBeNull();
    expect(p.knownSpells).toEqual(["s1"]);
    expect(p.avatar).toBeNull();
  });
});
