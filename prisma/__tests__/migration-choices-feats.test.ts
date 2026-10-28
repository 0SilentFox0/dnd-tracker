import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(path.resolve(__dirname, "../migrations/20261103000000_choices_feats/migration.sql"), "utf8");

describe("migration 20261103000000_choices_feats", () => {
  it("expand-only: new columns with defaults, feats table with RLS", () => {
    expect(sql).toContain(`ALTER TABLE "races" ADD COLUMN "choices" JSONB NOT NULL DEFAULT '[]'`);
    expect(sql).toContain(`ALTER TABLE "spells" ADD COLUMN "lists" JSONB NOT NULL DEFAULT '[]'`);
    expect(sql).toContain(`ALTER TABLE "classes" ADD COLUMN "spellList" TEXT`);
    expect(sql).toContain(`ADD COLUMN "feats" JSONB NOT NULL DEFAULT '[]'`);
    expect(sql).toContain(`ADD COLUMN "raceChoices" JSONB NOT NULL DEFAULT '{}'`);
    expect(sql).toContain(`CREATE TABLE "feats"`);
    expect(sql).toContain(`ALTER TABLE "feats" ENABLE ROW LEVEL SECURITY`);
    expect(sql).not.toMatch(/DROP|RENAME|ALTER COLUMN/);
  });
});
