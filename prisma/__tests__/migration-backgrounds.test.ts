import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("adds optional backgrounds with defaults, campaign scope, RLS and restricted character deletion", () => {
  const sql = readFileSync(resolve(__dirname, "../migrations/20261106000000_backgrounds/migration.sql"), "utf8");

  expect(sql).toContain('ALTER TABLE "backgrounds" ENABLE ROW LEVEL SECURITY');
  expect(sql).toContain('"backgroundChoices" JSONB NOT NULL DEFAULT');
  expect(sql).toContain('"backgroundFeatPicks" JSONB NOT NULL DEFAULT');
  expect(sql).toContain('"characters_backgroundId_fkey"');
  expect(sql).toContain('ON DELETE RESTRICT');
  expect(sql).toContain('"backgrounds_campaignId_name_idx"');
  expect(sql).not.toMatch(/DROP|RENAME|ALTER COLUMN/);
});
