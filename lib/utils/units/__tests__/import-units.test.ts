import { describe, expect, it, vi } from "vitest";

import { importUnitsSchema } from "@/lib/schemas/units";
import { importUnitsIntoCampaign, resolveImportRaces, toUnitCreateData } from "@/lib/utils/units/import-units";

const races = [
  { id: "r-old", name: "Гобліни" },
  { id: "r-new", name: "гобліни" },
  { id: "r-orc", name: "Орки" },
];

const aoe = { name: "Вогняний подих", type: "ranged", targetType: "aoe", attackBonus: 5, damageType: "fire", damageDice: "3d6", maxTargets: 3, damageDistribution: [50, 30, 20], guaranteedDamage: 2 };

const [row] = importUnitsSchema.parse({
  units: [{ name: "Дракончик", raceName: "ГОБЛІНИ", attacks: [aoe], specialAbilities: [{ name: "Луска", description: "Опір вогню", type: "passive" }] }],
}).units;

describe("unit import mapping", () => {
  it("раса за назвою без урахування регістру; найстаріша виграє; невідомі — у звіт без дублів", () => {
    const { raceIdOf, unknownRaces } = resolveImportRaces(["гобліни", " Орки ", "Ельфи", "ельфи", undefined, ""], races);

    expect(raceIdOf("ГОБЛІНИ")).toBe("r-old");
    expect(raceIdOf("орки")).toBe("r-orc");
    expect(raceIdOf("Ельфи")).toBeNull();
    expect(raceIdOf(undefined)).toBeNull();
    expect(unknownRaces).toEqual(["Ельфи"]);
  });

  it("атаки з усіма полями, raceId, abilities з особливостей; legacy-колонки не пишуться", () => {
    const data = toUnitCreateData("c1", row, "r-old");

    expect(data).toMatchObject({ campaignId: "c1", name: "Дракончик", raceId: "r-old", attacks: [aoe] });
    expect(Array.isArray(data.abilities)).toBe(true);
    expect(data).not.toHaveProperty("groupId");
    expect(data).not.toHaveProperty("race");
  });

  it("importUnitsIntoCampaign: пропускає наявні назви, ставить raceId, звітує невідомі раси", async () => {
    const db = {
      race: { findMany: vi.fn(async () => races) },
      unit: { findMany: vi.fn(async () => [{ name: "Вовк" }]), createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })) },
    };

    const rows = importUnitsSchema.parse({
      units: [
        { name: "Вовк", raceName: "Орки" },
        { name: "Гоблін", raceName: "гобліни" },
        { name: "Привид", raceName: "Нежить" },
      ],
    }).units;

    const report = await importUnitsIntoCampaign(db as never, "c1", rows);

    expect(db.race.findMany).toHaveBeenCalledWith({ where: { campaignId: "c1" }, select: { id: true, name: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    expect((db.unit.createMany.mock.calls[0][0].data as Array<{ name: string; raceId: string | null }>).map((d) => [d.name, d.raceId])).toEqual([
      ["Гоблін", "r-old"],
      ["Привид", null],
    ]);
    expect(report).toEqual({ imported: 2, total: 3, skipped: 1, unknownRaces: ["Нежить"] });
  });
});
