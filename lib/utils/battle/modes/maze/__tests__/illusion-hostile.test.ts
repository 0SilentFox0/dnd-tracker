import { describe, expect, it } from "vitest";

import { mazeMap } from "./fixtures";

import { ParticipantSide } from "@/lib/constants/battle";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { cleaveTargets } from "@/lib/utils/battle/attack/process/cleave";
import { enemiesInReach } from "@/lib/utils/battle/grid";
import { isHostile } from "@/lib/utils/battle/modes/engine";
import { resolveSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import type { IllusionPair } from "@/types/battle";

const ally = ParticipantSide.ALLY;

const a = placed("a", { side: ally, at: { x: 1, y: 1 } });

const b = placed("b", { side: ally, at: { x: 2, y: 1 } });

const c = placed("c", { side: ally, at: { x: 3, y: 1 } });

const foe = placed("foe", { side: ParticipantSide.ENEMY, at: { x: 4, y: 1 } });

const pair: IllusionPair = { a: "a", b: "b", aSees: { name: "X" }, bSees: { name: "Y" } };

describe("isHostile", () => {
  it("falls back to the side comparison without a mode", () => {
    expect(isHostile(null, a, foe)).toBe(true);
    expect(isHostile(testMap(), a, b)).toBe(false);
  });

  it("makes illusion partners hostile and leaves others by side", () => {
    const map = mazeMap({ illusionSwap: { pairs: [pair] } });

    expect(isHostile(map, a, b)).toBe(true);
    expect(isHostile(map, b, a)).toBe(true);
    expect(isHostile(map, a, c)).toBe(false);
    expect(isHostile(map, a, foe)).toBe(true);
  });

  it("is plain side comparison once the pairs are cleared", () => {
    expect(isHostile(mazeMap({ illusionSwap: { pairs: [] } }), a, b)).toBe(false);
  });
});

describe("illusion foes in the engine", () => {
  const withPair = mazeMap({ illusionSwap: { pairs: [pair] } });

  const noPair = mazeMap({ illusionSwap: { pairs: [] } });

  const order = [a, b, c];

  const ids = (ps: { basicInfo: { id: string } }[]) => ps.map((p) => p.basicInfo.id);

  it("melee reach includes the partner only while the pair is active", () => {
    expect(ids(enemiesInReach(withPair, order, a, a.battleData.attacks[0]))).toEqual(["b"]);
    expect(ids(enemiesInReach(noPair, order, a, a.battleData.attacks[0]))).toEqual([]);
  });

  it("cleave extra targets include the partner only while the pair is active", () => {
    const target = placed("t", { side: ParticipantSide.ENEMY, at: { x: 1, y: 2 } });

    expect(ids(cleaveTargets(withPair, [a, b, target], a, target, 2))).toEqual(["b"]);
    expect(ids(cleaveTargets(noPair, [a, b, target], a, target, 2))).toEqual([]);
  });

  it("an enemy-kind spell can pick the partner only while the pair is active", () => {
    const spell = { id: "s", groupId: null, level: 1 };

    const targeting = { kind: "enemy" as const, range: 60, maxTargets: 1 };

    expect(resolveSpellTargets(order, a, spell, targeting, ["b"], { map: withPair })).toMatchObject({ ok: true, targetIds: ["b"] });
    expect(resolveSpellTargets(order, a, spell, targeting, ["b"], { map: noPair }).ok).toBe(false);
  });
});
