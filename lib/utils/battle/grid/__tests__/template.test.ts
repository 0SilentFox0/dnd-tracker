import { describe, expect, it } from "vitest";

import { aimInRange, feetToCells, participantsInCells, rayCells, templateCells } from "../template";

import { CombatStatus } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { cols: 12, rows: 12, background: null, opacity: 0.3 };

const k = (x: number, y: number) => `${x}:${y}`;

function at(id: string, pos: GridPoint | undefined, extra: { size?: number; status?: BattleParticipant["combatStats"]["status"]; reserved?: boolean } = {}): BattleParticipant {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id },
    combatStats: { ...b.combatStats, status: extra.status ?? CombatStatus.ACTIVE, ...(extra.size && { gridSize: extra.size }) },
    battleData: { ...b.battleData, position: pos, ...(extra.reserved && { reserved: true }) },
  };
}

describe("feetToCells", () => {
  it("мінімум 1 клітинка, округлення вниз", () => {
    expect(feetToCells(0)).toBe(1);
    expect(feetToCells(4)).toBe(1);
    expect(feetToCells(12)).toBe(2);
    expect(feetToCells(30)).toBe(6);
  });
});

describe("templateCells", () => {
  it("коло 10 фт: 21 клітинка, без кутів 5×5", () => {
    const cells = templateCells(map, { shape: "circle", size: 10 }, [{ x: 0, y: 0 }], { x: 6, y: 6 });

    const expected: string[] = [];

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 6.25) expected.push(k(6 + dx, 6 + dy));
    }

    expect(cells).toHaveLength(21);
    expect([...cells].sort()).toEqual(expected.sort());
    expect(cells).not.toContain(k(4, 4));
  });

  it("куб 10 фт: 4 клітинки від aim; 15 фт: 9 з центром aim", () => {
    const even = templateCells(map, { shape: "cube", size: 10 }, [{ x: 0, y: 0 }], { x: 5, y: 5 });

    expect([...even].sort()).toEqual([k(5, 5), k(6, 5), k(5, 6), k(6, 6)].sort());

    const odd = templateCells(map, { shape: "cube", size: 15 }, [{ x: 0, y: 0 }], { x: 5, y: 5 });

    expect(odd).toHaveLength(9);
    expect(odd).toContain(k(4, 4));
    expect(odd).toContain(k(6, 6));
  });

  it("конус 15 фт праворуч", () => {
    const cells = templateCells(map, { shape: "cone", size: 15 }, [{ x: 0, y: 3 }], { x: 1, y: 3 });

    expect(cells).toEqual(expect.arrayContaining([k(1, 3), k(3, 2), k(3, 4)]));
    expect(cells).not.toContain(k(1, 2));
    expect(cells).not.toContain(k(0, 3));
    expect(cells).not.toContain(k(4, 3));
  });

  it("конус без напрямку порожній", () => {
    expect(templateCells(map, { shape: "cone", size: 15 }, [{ x: 2, y: 2 }], { x: 2, y: 2 })).toEqual([]);
  });

  it("лінія 30 фт на схід: 6 клітинок, продовжується за aim", () => {
    const cells = templateCells(map, { shape: "line", size: 30 }, [{ x: 0, y: 3 }], { x: 1, y: 3 });

    expect(cells).toEqual([k(1, 3), k(2, 3), k(3, 3), k(4, 3), k(5, 3), k(6, 3)]);
  });

  it("лінія обривається на краю карти й на першій неігровій клітинці", () => {
    const edge = templateCells(map, { shape: "line", size: 30 }, [{ x: 9, y: 3 }], { x: 10, y: 3 });

    expect(edge).toEqual([k(10, 3), k(11, 3)]);

    const blockedMap = { ...map, blocked: [k(2, 3)] };

    const cells = templateCells(blockedMap, { shape: "line", size: 15 }, [{ x: 0, y: 3 }], { x: 3, y: 3 });

    expect(cells).toEqual([k(1, 3)]);
  });

  it("коло біля краю й через неігрові клітинки відкидає їх", () => {
    const m = { ...map, blocked: [k(1, 0)] };

    const cells = templateCells(m, { shape: "circle", size: 10 }, [{ x: 5, y: 5 }], { x: 0, y: 0 });

    expect(cells).not.toContain(k(-1, 0));
    expect(cells).not.toContain(k(1, 0));
    expect(cells).toContain(k(0, 0));
    expect(cells).toContain(k(2, 0));
  });
});

describe("participantsInCells", () => {
  it("великий 2×2 зачеплений однією клітинкою; пропускає мертвих, резерв, без позиції; сортує за відстанню", () => {
    const big = at("big", { x: 4, y: 4 }, { size: 2 });

    const near = at("near", { x: 2, y: 2 });

    const dead = at("dead", { x: 2, y: 3 }, { status: CombatStatus.DEAD });

    const res = at("res", { x: 3, y: 2 }, { reserved: true });

    const none = at("none", undefined);

    const out = participantsInCells([big, near, dead, res, none], [k(5, 5), k(2, 2), k(2, 3), k(3, 2)], { x: 0, y: 0 });

    expect(out.map((p) => p.basicInfo.id)).toEqual(["near", "big"]);
  });
});

describe("aimInRange", () => {
  it("undefined — завжди; 2×2 рахує від найближчої клітинки", () => {
    const origin = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];

    expect(aimInRange(origin, { x: 50, y: 50 }, undefined)).toBe(true);
    expect(aimInRange(origin, { x: 7, y: 1 }, 30)).toBe(true);
    expect(aimInRange(origin, { x: 8, y: 1 }, 30)).toBe(false);
  });
});

describe("rayCells", () => {
  it("тягнеться на maxCells від початку, не включаючи його", () => {
    expect(rayCells(map, { x: 0, y: 3 }, { x: 1, y: 3 }, { maxCells: 3 })).toEqual([{ x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }]);
  });

  it("stopAtTarget зупиняється на цілі", () => {
    expect(rayCells(map, { x: 0, y: 0 }, { x: 2, y: 2 }, { maxCells: 9, stopAtTarget: true })).toEqual([{ x: 1, y: 1 }, { x: 2, y: 2 }]);
  });

  it("обривається на краю карти й на стіні", () => {
    expect(rayCells(map, { x: 10, y: 3 }, { x: 11, y: 3 }, { maxCells: 5 })).toEqual([{ x: 11, y: 3 }]);
    expect(rayCells({ ...map, blocked: [k(2, 3)] }, { x: 0, y: 3 }, { x: 1, y: 3 }, { maxCells: 5 })).toEqual([{ x: 1, y: 3 }]);
  });

  it("порожній без напрямку", () => {
    expect(rayCells(map, { x: 1, y: 1 }, { x: 1, y: 1 }, { maxCells: 3 })).toEqual([]);
  });
});
