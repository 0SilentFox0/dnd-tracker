import { describe, expect, it } from "vitest";

import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { CLAWS, placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { rollModeReasons } from "@/lib/utils/battle/attack/bonus";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

const fog = (...keys: string[]): BattleMapConfig => testMap(10, 10, { terrain: Object.fromEntries(keys.map((k) => [k, { kind: "hazard" as const, obscured: true }])) });

const sense = (sense: string) => resolved({ name: "Чуття", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "sense", sense, range: 30 } as never] });

const reasons = (ps: BattleParticipant[], map: BattleMapConfig) => rollModeReasons(ps[0], CLAWS, ps, { targetId: ps[1].basicInfo.id, map });

const pair = (abilities = [] as ReturnType<typeof sense>[]) => [placed("a", { at: { x: 0, y: 0 }, abilities }), placed("t", { at: { x: 1, y: 0 } })];

describe("заслонена клітинка", () => {
  it("нападник у ній не бачить ціль: перешкода", () => {
    const r = reasons(pair(), fog("0:0"));

    expect(r.disadvantage).toHaveLength(1);
    expect(r.advantage).toEqual([]);
  });

  it("ціль у ній не бачить нападника: перевага", () => {
    const r = reasons(pair(), fog("1:0"));

    expect(r.advantage).toHaveLength(1);
    expect(r.disadvantage).toEqual([]);
  });

  it("обоє в ній: є обидва джерела (гасяться)", () => {
    const r = reasons(pair(), fog("0:0", "1:0"));

    expect(r.advantage).toHaveLength(1);
    expect(r.disadvantage).toHaveLength(1);
  });

  it("без заслонення чи без мапи нічого не змінюється", () => {
    expect(reasons(pair(), testMap())).toEqual({ advantage: [], disadvantage: [] });
    expect(rollModeReasons(pair()[0], CLAWS, pair(), { targetId: "t" })).toEqual({ advantage: [], disadvantage: [] });
  });

  it("істинний зір нападника знімає його перешкоду", () => {
    expect(reasons(pair([sense("truesight")]), fog("0:0")).disadvantage).toEqual([]);
  });

  it("чуття цілі знімає перевагу нападника", () => {
    const ps = [placed("a", { at: { x: 0, y: 0 } }), placed("t", { at: { x: 1, y: 0 }, abilities: [sense("blindsight")] })];

    expect(reasons(ps, fog("1:0")).advantage).toEqual([]);
  });

  it("багатоклітинний нападник заслонений, якщо хоч одна клітинка в тумані", () => {
    const ps = [placed("a", { at: { x: 0, y: 0 }, size: 2 }), placed("t", { at: { x: 3, y: 0 } })];

    expect(reasons(ps, fog("1:1")).disadvantage).toHaveLength(1);
  });
});
