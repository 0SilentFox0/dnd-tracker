import { describe, expect, it } from "vitest";

import { UNGROUPED_KEY } from "@/lib/constants/ungrouped";
import { groupUnitsByRace, groupUnitsByRaceName, isTypeGroup, NO_RACE, raceChips, raceIdOfGroup } from "@/lib/utils/units/group-units";
import type { Unit } from "@/types/units";

const races = [
  { id: "r2", name: "Орки", color: "#ef4444", icon: null },
  { id: "r1", name: "Гобліни", color: null, icon: "https://x/g.png" },
];

const u = (id: string, name: string, level: number, raceId: string | null) => ({ id, name, level, raceId }) as Unit;

const units = [u("1", "Шаман", 2, "r2"), u("2", "Берсерк", 2, "r2"), u("3", "Воїн", 1, "r2"), u("4", "Вовк", 1, null), u("5", "Привид", 3, "deleted")];

describe("groupUnitsByRace", () => {
  it("раси за назвою, «Без раси» в кінці; тири за зростанням, юніти за назвою", () => {
    const g = groupUnitsByRace(units, races);

    expect(g.map((x) => x.key)).toEqual(["r1", "r2", NO_RACE]);
    expect(g[0]).toMatchObject({ total: 0, tiers: [] });
    expect(g[1].tiers.map((t) => [t.level, t.units.map((x) => x.name)])).toEqual([
      [1, ["Воїн"]],
      [2, ["Берсерк", "Шаман"]],
    ]);
    expect(g[2].race).toBeNull();
    expect(g[2].tiers.flatMap((t) => t.units.map((x) => x.id))).toEqual(["4", "5"]);
  });

  it("пошук без урахування регістру лишає лише групи зі збігами, total — без фільтра", () => {
    const g = groupUnitsByRace(units, races, "  ВО ");

    expect(g.map((x) => x.key)).toEqual(["r2", NO_RACE]);
    expect(g[0].total).toBe(3);
    expect(g[0].tiers.flatMap((t) => t.units.map((x) => x.name))).toEqual(["Воїн"]);
  });

  it("raceIdOfGroup: «Без раси» → null", () => {
    expect(raceIdOfGroup(NO_RACE)).toBeNull();
    expect(raceIdOfGroup("r1")).toBe("r1");
  });

  it("raceChips: назва, колір і кількість", () => {
    expect(raceChips(groupUnitsByRace(units, races))).toEqual([
      { key: "r1", label: "Гобліни", color: null, count: 0 },
      { key: "r2", label: "Орки", color: "#ef4444", count: 3 },
      { key: NO_RACE, label: "Без раси", color: null, count: 2 },
    ]);
  });
});

describe("groupUnitsByRaceName", () => {
  it("groups by race name, falls back to «Без раси» and sorts each group by level", () => {
    const list = [
      { id: "a", level: 3, raceName: "Орки" },
      { id: "b", level: 1, raceName: " Орки " },
      { id: "c", level: 2, raceName: null },
    ];

    const grouped = groupUnitsByRaceName(list);

    expect([...grouped.keys()].sort()).toEqual([UNGROUPED_KEY, "Орки"].sort());
    expect(grouped.get("Орки")?.map((x) => x.id)).toEqual(["b", "a"]);
    expect(grouped.get(UNGROUPED_KEY)?.map((x) => x.id)).toEqual(["c"]);
  });

  it("юніти без раси групуються за типом істоти, решта — «Без раси»", () => {
    const typed = (id: string, type: string) => ({ id, name: id, level: 1, raceId: null, statblock: { creatureType: type } }) as Unit;

    const g = groupUnitsByRace([typed("a", "beast"), typed("b", "Beast"), typed("c", "undead"), u("d", "Д", 1, null), u("e", "Е", 1, "r1")], races);

    expect(g.map((x) => [x.key, x.label, x.total])).toEqual([
      ["r1", "Гобліни", 1],
      ["r2", "Орки", 0],
      ["type:beast", "Звірі", 2],
      ["type:undead", "Нежить", 1],
      [NO_RACE, "Без раси", 1],
    ]);
    expect(isTypeGroup("type:beast")).toBe(true);
    expect(raceIdOfGroup("type:beast")).toBeNull();
  });
});
