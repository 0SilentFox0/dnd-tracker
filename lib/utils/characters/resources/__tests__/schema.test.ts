import { describe, expect, it } from "vitest";

import { compactResources, currentHp, withHp } from "@/lib/utils/characters/resources/hp";
import { readResources } from "@/lib/utils/characters/resources/schema";

describe("readResources", () => {
  it("empty / invalid → {}", () => {
    for (const raw of [undefined, null, "x", 42, [], { hp: -1 }, { exhaustion: 7 }, { charges: { a: { used: 1, rest: "day" } } }]) expect(readResources(raw)).toEqual({});
  });

  it("keeps valid fields", () => {
    const r = { hp: 0, tempHp: 3, dead: true, slotsSpent: { "1": 2, pact: 1 }, hitDiceSpent: { fighter: 1 }, charges: { "class:f:surge": { used: 1, rest: "short" } }, exhaustion: 2, shortRestOpen: true };

    expect(readResources(r)).toEqual(r);
  });

  it("drops only the malformed field, keeps the rest", () => {
    expect(readResources({ hp: 5, exhaustion: 9, slotsSpent: { "1": 2 }, charges: { a: { used: 1, rest: "day" } } })).toEqual({ hp: 5, slotsSpent: { "1": 2 } });
  });

  it("rejects a foreign slot key", () => {
    expect(readResources({ slotsSpent: { "10": 1 } })).toEqual({});
  });
});

describe("hp helpers", () => {
  it("currentHp clamps to [0, max]; missing = full", () => {
    expect(currentHp({}, 20)).toBe(20);
    expect(currentHp({ hp: 35 }, 20)).toBe(20);
    expect(currentHp({ hp: 0 }, 20)).toBe(0);
  });

  it("withHp drops hp at or above max", () => {
    expect(withHp({ hp: 3 }, 20, 20)).toEqual({});
    expect(withHp({}, 7, 20)).toEqual({ hp: 7 });
  });

  it("compactResources drops neutral values but keeps hp 0", () => {
    expect(compactResources({ hp: 0, tempHp: 0, dead: false, slotsSpent: {}, exhaustion: 0, shortRestOpen: false })).toEqual({ hp: 0 });
  });
});
