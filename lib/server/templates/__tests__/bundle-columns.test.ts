import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { BUNDLE_TABLES, pick, toPrismaJson } from "../bundle";

describe("bundle: class table", () => {
  it("classes carry the columns column", () => {
    expect(BUNDLE_TABLES.find((t) => t.key === "classes")?.columns).toContain("columns");
  });
});

describe("bundle: spell table", () => {
  it("spells carry ingredient columns, componentFlags nullable", () => {
    const spells = BUNDLE_TABLES.find((t) => t.key === "spells")!;

    expect(spells.columns).toEqual(expect.arrayContaining(["ingredients", "componentFlags"]));
    expect(spells.nullableJson).toContain("componentFlags");
    expect(spells.nullableJson).not.toContain("ingredients");
  });

  it("round-trips ingredients and null flags through pick + toPrismaJson", () => {
    const spells = BUNDLE_TABLES.find((t) => t.key === "spells")!;

    const ingredients = [{ name: "Diamond", qty: 1, minGp: 300, consumed: true, focus: false }];

    const row = pick({ name: "Revivify", ingredients, componentFlags: null, campaignId: "x" }, spells.columns);

    const out = toPrismaJson(row, spells);

    expect(out.ingredients).toEqual(ingredients);
    expect(out.componentFlags).toBe(Prisma.DbNull);
    expect(out).not.toHaveProperty("campaignId");
  });
});
