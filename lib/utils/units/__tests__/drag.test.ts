import { describe, expect, it } from "vitest";

import { parseUnitDragPayload, planUnitDrop, type UnitDragPayload, unitDragPayload } from "@/lib/utils/units/drag";

const payload = parseUnitDragPayload(unitDragPayload({ id: "u1", raceId: "r1", level: 2 })) as UnitDragPayload;

describe("unit drag", () => {
  it("payload туди й назад", () => {
    expect(payload).toEqual({ unitId: "u1", raceId: "r1", level: 2 });
  });

  it("на «Без раси» — raceId: null (не рядок «Без раси»)", () => {
    expect(planUnitDrop(payload, { raceId: null })).toEqual({ raceId: null });
  });

  it("на іншу расу — лише raceId; на свою — нічого", () => {
    expect(planUnitDrop(payload, { raceId: "r2" })).toEqual({ raceId: "r2" });
    expect(planUnitDrop(payload, { raceId: "r1" })).toBeNull();
  });

  it("на рівень — лише level; той самий рівень — нічого", () => {
    expect(planUnitDrop(payload, { level: 3 })).toEqual({ level: 3 });
    expect(planUnitDrop(payload, { level: 2 })).toBeNull();
  });

  it("юніт без раси на «Без раси» — нічого", () => {
    const none = parseUnitDragPayload(unitDragPayload({ id: "u2", raceId: null, level: 1 })) as UnitDragPayload;

    expect(planUnitDrop(none, { raceId: null })).toBeNull();
  });

  it("битий payload — null", () => {
    expect(parseUnitDragPayload("{oops")).toBeNull();
    expect(parseUnitDragPayload(JSON.stringify({ raceId: "r1" }))).toBeNull();
  });
});
