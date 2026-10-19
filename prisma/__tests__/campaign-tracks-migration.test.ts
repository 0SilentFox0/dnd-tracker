import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(path.resolve(__dirname, "../migrations/20261020000000_campaign_tracks_battle_audio/migration.sql"), "utf8");

describe("міграція музики", () => {
  it("лише розширює схему: без DROP, ALTER COLUMN і NOT NULL на наявних таблицях", () => {
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/ALTER COLUMN/i);
    expect(sql).toMatch(/ALTER TABLE "battle_scenes" ADD COLUMN "audio" JSONB;/);
  });

  it("campaign_tracks: каскад від кампанії, індекс порядку, RLS", () => {
    expect(sql).toMatch(/CREATE TABLE "campaign_tracks"/);
    expect(sql).toMatch(/REFERENCES "campaigns"\("id"\) ON DELETE CASCADE/);
    expect(sql).toMatch(/CREATE INDEX "campaign_tracks_campaignId_sortOrder_idx"/);
    expect(sql).toMatch(/ALTER TABLE "campaign_tracks" ENABLE ROW LEVEL SECURITY;/);
  });
});
