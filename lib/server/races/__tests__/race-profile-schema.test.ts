import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

describe("RaceProfile prisma model", () => {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === "RaceProfile") as { fields: { name: string; isId: boolean; relationOnDelete?: string }[]; dbName: string | null };

  it("is keyed by raceId and cascades with the race", () => {
    expect(model.fields.find((f) => f.name === "raceId")?.isId).toBe(true);
    expect(model.fields.find((f) => f.name === "race")?.relationOnDelete).toBe("Cascade");
    expect(model.dbName).toBe("race_profiles");
  });
});
