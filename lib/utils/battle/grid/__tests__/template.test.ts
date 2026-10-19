import { describe, expect, it } from "vitest";

import { aimInRange, areaCentre, areaRadiusCells, feetToCells, participantsInCells, templateCells, templateCentre } from "../template";

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

describe("areaRadiusCells", () => {
  it("до 15 фт — 1 клітинка (3×3), 20 фт — 2 (5×5); дальність лишається 5 фт на клітинку", () => {
    expect([5, 10, 15, 20, 30].map(areaRadiusCells)).toEqual([1, 1, 1, 2, 3]);
    expect(feetToCells(20)).toBe(4);
  });
});

describe("templateCells", () => {
  it("Вогняна куля (коло 10 фт) у (5,5): рівно 3×3 — x і y від 4 до 6", () => {
    const cells = templateCells(map, { shape: "circle", size: 10 }, [{ x: 0, y: 0 }], { x: 5, y: 5 });

    const expected: string[] = [];

    for (let y = 4; y <= 6; y++) {
      for (let x = 4; x <= 6; x++) expected.push(k(x, y));
    }

    expect([...cells].sort()).toEqual(expected.sort());
  });

  it("коло 5 і 15 фт — 3×3, Землетрус (20 фт) — 5×5", () => {
    const aim = { x: 6, y: 6 };

    expect(templateCells(map, { shape: "circle", size: 5 }, [{ x: 0, y: 0 }], aim)).toHaveLength(9);
    expect(templateCells(map, { shape: "circle", size: 15 }, [{ x: 0, y: 0 }], aim)).toHaveLength(9);

    const quake = templateCells(map, { shape: "circle", size: 20 }, [{ x: 0, y: 0 }], aim);

    expect(quake).toHaveLength(25);
    expect(quake).toEqual(expect.arrayContaining([k(4, 4), k(8, 8), k(4, 8), k(8, 4)]));
    expect(quake).not.toContain(k(9, 6));
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

  it("лінія обривається на краю карти, неігрові клітинки пропускає але йде далі", () => {
    const edge = templateCells(map, { shape: "line", size: 30 }, [{ x: 9, y: 3 }], { x: 10, y: 3 });

    expect(edge).toEqual([k(10, 3), k(11, 3)]);

    const blockedMap = { ...map, blocked: [k(2, 3)] };

    const cells = templateCells(blockedMap, { shape: "line", size: 15 }, [{ x: 0, y: 3 }], { x: 3, y: 3 });

    expect(cells).toEqual([k(1, 3), k(3, 3)]);
  });

  it("коло біля краю й через неігрові клітинки відкидає їх", () => {
    const m = { ...map, blocked: [k(1, 0)] };

    const cells = templateCells(m, { shape: "circle", size: 10 }, [{ x: 5, y: 5 }], { x: 0, y: 0 });

    expect([...cells].sort()).toEqual([k(0, 0), k(0, 1), k(1, 1)].sort());

    const quake = templateCells(map, { shape: "circle", size: 20 }, [{ x: 5, y: 5 }], { x: 11, y: 11 });

    expect(quake).toHaveLength(9);
    expect(quake).not.toContain(k(12, 11));
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

describe("templateCentre", () => {
  it("коло — точка прицілу; лінія — клітинка біля центроїда; порожньо — undefined", () => {
    const line = [k(2, 1), k(3, 1), k(4, 1), k(5, 1), k(6, 1)];

    expect(templateCentre({ shape: "circle", size: 10 }, { x: 4, y: 4 }, [k(4, 4)])).toEqual({ x: 4, y: 4 });
    expect(templateCentre({ shape: "line", size: 25 }, { x: 11, y: 1 }, line)).toEqual({ x: 4, y: 1 });
    expect(areaCentre([])).toBeUndefined();
  });
});
