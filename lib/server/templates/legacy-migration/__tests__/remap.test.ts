import { describe, expect, it } from "vitest";

import { cuidTokens, remapDeep, residualKind } from "@/lib/server/templates/legacy-migration/remap";

const OLD = "cold000000000000000000001";

const NEW = "cnew000000000000000000001";

const OLD2 = "cold000000000000000000002";

const NEW2 = "cnew000000000000000000002";

const map = new Map([[OLD, NEW], [OLD2, NEW2]]);

describe("remapDeep", () => {
  it("remaps strings, arrays and nested objects", () => {
    expect(remapDeep(OLD, map)).toBe(NEW);
    expect(remapDeep(["x", OLD, [OLD2]], map)).toEqual(["x", NEW, [NEW2]]);
    expect(remapDeep({ a: { b: [OLD], c: 1, d: true } }, map)).toEqual({ a: { b: [NEW], c: 1, d: true } });
  });

  it("remaps object keys and their values", () => {
    expect(remapDeep({ [OLD]: ["s1", OLD2] }, map)).toEqual({ [NEW]: ["s1", NEW2] });
  });

  it("remaps itemRef base:prop:param and itemStats JSON values", () => {
    expect(remapDeep(`${OLD}+${OLD2}~fire`, map)).toBe(`${NEW}+${NEW2}~fire`);

    const stats = { type: "itemStats", value: JSON.stringify({ [OLD]: OLD2, list: [OLD] }) };

    const out = remapDeep(stats, map);

    expect(JSON.parse(out.value)).toEqual({ [NEW]: NEW2, list: [NEW] });
    expect(out.type).toBe("itemStats");
  });

  it("keeps malformed itemStats, composite ids, Date and null", () => {
    const bad = { type: "itemStats", value: "{oops" };

    const date = new Date(0);

    const composite = `${OLD}-1-1700000000`;

    expect(remapDeep(bad, map)).toEqual(bad);
    expect(remapDeep(composite, map)).toBe(composite);
    expect(remapDeep(date, map)).toBe(date);
    expect(remapDeep(null, map)).toBeNull();
  });
});

describe("cuidTokens", () => {
  it("finds every cuid, including inside composite strings", () => {
    const composite = `${OLD}-1-1700000000`;

    expect(cuidTokens(`${composite} and ${NEW2}`)).toEqual([OLD, NEW2]);
    expect(residualKind(composite, OLD)).toBe("composite");
    expect(residualKind(OLD, OLD)).toBe("exact");
    expect(cuidTokens("no ids here")).toEqual([]);
  });
});
