import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("compendium provenance migration", () => {
  it("keeps provenance separate from template lineage with scoped uniqueness and RLS", () => {
    const sql = readFileSync("prisma/migrations/20261107000000_compendium_import/migration.sql", "utf8");

    for (const table of ["compendium_sources", "compendium_entries", "compendium_import_runs"]) {
      expect(sql).toContain(`CREATE TABLE "${table}"`);
      expect(sql).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
    }
    expect(sql).toContain('"campaignId", "canonicalKey"');
    expect(sql).toContain('"campaignId", "idempotencyKey"');
    expect(sql).toContain('"executionMode"');
    expect(sql).not.toContain('ALTER COLUMN "sourceId"');
  });
});
