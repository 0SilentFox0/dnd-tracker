import { describe, expect, it } from "vitest";

import { type HitDiceEntry, hitDicePool, restoreHitDice, spendHitDie } from "@/lib/utils/characters/resources/hit-dice";
import type { GameClassData, ResolvedClassEntry } from "@/types/classes";

const pool: HitDiceEntry[] = [
  { classId: "wiz", name: "Маг", die: 6, level: 3 },
  { classId: "fig", name: "Воїн", die: 10, level: 2 },
];

describe("hitDicePool", () => {
  it("skips unresolved classes", () => {
    const fig = { id: "fig", name: "Воїн", hitDie: 10 } as GameClassData;

    const entries: ResolvedClassEntry[] = [{ classId: "fig", level: 2, class: fig, subclass: null }, { classId: "ghost", level: 1, class: null, subclass: null }];

    expect(hitDicePool(entries)).toEqual([{ classId: "fig", name: "Воїн", die: 10, level: 2 }]);
  });
});

describe("restoreHitDice", () => {
  it("half of total level (min 1), biggest dice first", () => {
    expect(restoreHitDice({ wiz: 3, fig: 2 }, pool, "half")).toEqual({ wiz: 3 });
  });

  it("half is at least 1", () => {
    expect(restoreHitDice({ fig: 1 }, [{ classId: "fig", name: "Воїн", die: 10, level: 1 }], "half")).toBeUndefined();
  });

  it("all restores everything", () => {
    expect(restoreHitDice({ wiz: 3, fig: 2 }, pool, "all")).toBeUndefined();
  });

  it("drops classes the hero no longer has", () => {
    expect(restoreHitDice({ old: 2, wiz: 1 }, pool, "half")).toBeUndefined();
  });
});

describe("spendHitDie", () => {
  const open = { shortRestOpen: true, hp: 5 };

  it("heals d + CON up to max and counts the die", () => {
    expect(spendHitDie(open, { pool, classId: "fig", roll: 7, conMod: 2, maxHp: 30 })).toEqual({
      ok: true, die: 10, healed: 9, hpBefore: 5, hpAfter: 14, resources: { shortRestOpen: true, hp: 14, hitDiceSpent: { fig: 1 } },
    });
  });

  it("healing reaching max drops hp", () => {
    const r = spendHitDie({ shortRestOpen: true, hp: 28 }, { pool, classId: "fig", roll: 7, conMod: 0, maxHp: 30 });

    expect(r.ok && r.resources).toEqual({ shortRestOpen: true, hitDiceSpent: { fig: 1 } });
  });

  it("negative CON never heals below 0", () => {
    const r = spendHitDie(open, { pool, classId: "wiz", roll: 1, conMod: -3, maxHp: 30 });

    expect(r.ok && r.healed).toBe(0);
  });

  it.each([
    [{ hp: 5 }, "fig", "closed"],
    [{ ...open, dead: true }, "fig", "dead"],
    [{ ...open, hitDiceSpent: { fig: 2 } }, "fig", "no_dice"],
    [open, "rogue", "no_dice"],
    [{ shortRestOpen: true }, "fig", "hp_full"],
  ])("%j / %s → %s", (r, classId, error) => {
    expect(spendHitDie(r, { pool, classId, roll: 5, conMod: 0, maxHp: 30 })).toEqual({ ok: false, error });
  });
});
