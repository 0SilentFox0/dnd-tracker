import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(path.resolve(__dirname, "../migrations/20261121000001_content_base/migration.sql"), "utf8");

const SCHEMA = readFileSync(path.resolve(__dirname, "../schema.prisma"), "utf8");

const EXPECTED = [
  "artifacts.setId",
  "character_skills.skillTreeId",
  "characters.backgroundId",
  "main_skills.spellGroupId",
  "skills.grantedSpellId",
  "skills.mainSkillId",
  "skills.spellGroupId",
  "skills.spellId",
  "skills.spellNewSpellId",
  "spells.groupId",
  "spells.summonUnitId",
  "units.raceId",
];

const dropped = [...MIGRATION.matchAll(/^ALTER TABLE "(\w+)" DROP CONSTRAINT "\1_(\w+)_fkey";$/gm)].map((m) => `${m[1]}.${m[2]}`);

function relationColumns(table: string): string[] {
  for (const m of SCHEMA.matchAll(/^model\s+\w+\s*\{([\s\S]*?)^\}/gm)) {
    if (m[1].includes(`@@map("${table}")`)) return [...m[1].matchAll(/@relation\([^)]*fields:\s*\[(\w+)\]/g)].map((r) => r[1]);
  }

  return [];
}

describe("content_base FK drop (documented drift, see .claude/rules/db-deploy.md)", () => {
  it("drops exactly the expected constraints", () => {
    expect([...dropped].sort()).toEqual(EXPECTED);
  });

  it.each(EXPECTED)("%s keeps its @relation in schema.prisma", (key) => {
    const [table, column] = key.split(".");

    expect(relationColumns(table)).toContain(column);
  });
});
