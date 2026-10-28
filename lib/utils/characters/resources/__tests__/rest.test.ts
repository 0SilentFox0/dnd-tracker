import { describe, expect, it } from "vitest";

import type { HitDiceEntry } from "@/lib/utils/characters/resources/hit-dice";
import { applyRest } from "@/lib/utils/characters/resources/rest";
import type { CharacterResources } from "@/types/characters";

const pool: HitDiceEntry[] = [{ classId: "fig", name: "Воїн", die: 10, level: 4 }];

const opts = { pool, longRestHitDice: "half" as const };

const tired: CharacterResources = {
  hp: 3, tempHp: 4, slotsSpent: { "1": 2, pact: 1 }, hitDiceSpent: { fig: 4 },
  charges: { a: { used: 1, rest: "short" }, b: { used: 2, rest: "long" } }, exhaustion: 2,
};

describe("applyRest", () => {
  it("short: regain-limited long charge gets one use back", () => {
    const r = { charges: { sw: { used: 2, rest: "long" as const, regain: 1 }, once: { used: 1, rest: "long" as const, regain: 1 } } };

    expect(applyRest("short", r, opts).charges).toEqual({ sw: { used: 1, rest: "long", regain: 1 } });
  });

  it("short: pact and short charges back, window opens", () => {
    expect(applyRest("short", tired, opts)).toEqual({
      hp: 3, tempHp: 4, slotsSpent: { "1": 2 }, hitDiceSpent: { fig: 4 }, charges: { b: { used: 2, rest: "long" } }, exhaustion: 2, shortRestOpen: true,
    });
  });

  it("long: everything back, half hit dice, exhaustion −1, window closes", () => {
    expect(applyRest("long", { ...tired, shortRestOpen: true }, opts)).toEqual({ hitDiceSpent: { fig: 2 }, exhaustion: 1 });
  });

  it("long with 2024 hit dice restores all", () => {
    expect(applyRest("long", tired, { ...opts, longRestHitDice: "all" })).toEqual({ exhaustion: 1 });
  });

  it("long: last exhaustion level disappears", () => {
    expect(applyRest("long", { exhaustion: 1 }, opts)).toEqual({});
  });

  it("dead heroes are skipped by short and long", () => {
    const dead: CharacterResources = { hp: 0, dead: true, slotsSpent: { pact: 1 } };

    expect(applyRest("short", dead, opts)).toBe(dead);
    expect(applyRest("long", dead, opts)).toBe(dead);
  });

  it("close only closes the window", () => {
    expect(applyRest("close", { hp: 3, shortRestOpen: true }, opts)).toEqual({ hp: 3 });
  });
});
