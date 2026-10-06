import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const FILE = path.resolve(__dirname, "../migrations/20261011000000_units_race_id/migration.sql");

const sql = () => readFileSync(FILE, "utf8");

describe("migration units_race_id", () => {
  it("існує", () => {
    expect(existsSync(FILE)).toBe(true);
  });

  it("лише expand: без DROP і без SET NOT NULL", () => {
    expect(sql()).not.toMatch(/\bDROP\b/i);
    expect(sql()).not.toMatch(/SET NOT NULL/i);
  });

  it("units.raceId з FK ON DELETE SET NULL та індексом, races.color", () => {
    expect(sql()).toMatch(/ALTER TABLE "units" ADD COLUMN\s+"raceId" TEXT/);
    expect(sql()).toMatch(/FOREIGN KEY \("raceId"\) REFERENCES "races"\("id"\) ON DELETE SET NULL/);
    expect(sql()).toMatch(/CREATE INDEX "units_raceId_idx" ON "units"\("raceId"\)/);
    expect(sql()).toMatch(/ALTER TABLE "races" ADD COLUMN\s+"color" TEXT/);
  });

  it("backfill: точний збіг у межах кампанії, при дублях — найстаріша раса, спершу units.race, потім назва групи", () => {
    const s = sql();

    expect(s).toMatch(/r\."campaignId" = u\."campaignId"/);
    expect(s).toMatch(/ORDER BY r\."createdAt" ASC, r\."id" ASC/);
    expect(s.indexOf('r."name" = u."race"')).toBeGreaterThan(-1);
    expect(s.indexOf('r."name" = g."name"')).toBeGreaterThan(s.indexOf('r."name" = u."race"'));
  });
});
