import { describe, expect, it } from "vitest";

import { blockedSet, cellKey, isPlayable, marginCells } from "../geometry";
import { canStand, fits } from "../occupancy";
import { reachable } from "../path";
import { placeParticipants } from "../placement";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const base: BattleMapConfig = { cols: 20, rows: 12, background: null, opacity: 0.3 };

const map: BattleMapConfig = { ...base, blocked: marginCells(base, 3) };

function p(id: string, side: string, position?: GridPoint, speed = 120): BattleParticipant {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] },
    combatStats: { ...b.combatStats, speed },
    battleData: { ...b.battleData, position },
  };
}

function parse(key: string): GridPoint {
  const [x, y] = key.split(":").map(Number);

  return { x, y };
}

describe("неігрові клітинки", () => {
  it("marginCells і isPlayable", () => {
    expect(marginCells(base, 3)).toHaveLength(20 * 12 - 14 * 6);
    expect(isPlayable(map, { x: 2, y: 5 })).toBe(false);
    expect(isPlayable(map, { x: 3, y: 3 })).toBe(true);
    expect(isPlayable(map, { x: 17, y: 3 })).toBe(false);
    expect(isPlayable(base, { x: 0, y: 0 })).toBe(true);
    expect(blockedSet(map)).toBe(blockedSet(map));
  });

  it("fits і canStand відмовляють у заблокованій клітинці, також для великих істот", () => {
    const hero = p("h", ParticipantSide.ALLY, { x: 3, y: 3 });

    expect(fits(map, { x: 2, y: 3 }, 1, new Set())).toBe(false);
    expect(fits(map, { x: 2, y: 4 }, 2, new Set())).toBe(false);
    expect(canStand(map, [hero], hero, { x: 3, y: 4 })).toBe(true);
    expect(canStand(map, [hero], hero, { x: 2, y: 4 })).toBe(false);
  });

  it("reachable не заходить у поля", () => {
    const hero = p("h", ParticipantSide.ALLY, { x: 3, y: 3 });

    const reach = reachable(map, [hero], hero, 24);

    expect(reach.size).toBeGreaterThan(0);
    expect([...reach.keys()].every((k) => isPlayable(map, parse(k)))).toBe(true);
  });

  it("авторозстановка оминає поля, а позицію в полі переставляє", () => {
    const out = placeParticipants(map, [p("a1", ParticipantSide.ALLY), p("a2", ParticipantSide.ALLY, { x: 0, y: 0 }), p("e1", ParticipantSide.ENEMY)]);

    for (const x of out) expect(isPlayable(map, x.battleData.position as GridPoint)).toBe(true);

    expect(cellKey(out[1].battleData.position as GridPoint)).not.toBe("0:0");
  });
});
