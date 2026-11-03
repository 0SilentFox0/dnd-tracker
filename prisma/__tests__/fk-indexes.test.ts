import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SCHEMA = readFileSync(path.resolve(__dirname, "../schema.prisma"), "utf8");

const UNINDEXED_FK_EXCEPTIONS: string[] = [];

function parseModels(schema: string): Map<string, string[]> {
  const models = new Map<string, string[]>();

  for (const m of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    models.set(m[1], m[2].split("\n").map((line) => line.trim()));
  }

  return models;
}

function firstColumn(list: string): string {
  return list
    .split(",")[0]
    .trim()
    .replace(/\(.*$/, "");
}

function indexLeadColumns(lines: string[]): Set<string> {
  const lead = new Set<string>();

  for (const line of lines) {
    const block = line.match(/^@@(?:index|unique|id)\(\s*\[([^\]]+)\]/);

    if (block) lead.add(firstColumn(block[1]));

    const field = line.match(/^(\w+)\s+\S+.*(?:@unique|@id)\b/);

    if (field) lead.add(field[1]);
  }

  return lead;
}

function foreignKeyColumns(lines: string[]): string[] {
  const cols: string[] = [];

  for (const line of lines) {
    const rel = line.match(/@relation\([^)]*fields:\s*\[([^\]]+)\]/);

    if (rel) cols.push(firstColumn(rel[1]));
  }

  return cols;
}

describe("prisma schema FK indexes", () => {
  it("every foreign key column leads an index or unique key", () => {
    const missing: string[] = [];

    for (const [model, lines] of parseModels(SCHEMA)) {
      const lead = indexLeadColumns(lines);

      for (const col of foreignKeyColumns(lines)) {
        const key = `${model}.${col}`;

        if (!lead.has(col) && !UNINDEXED_FK_EXCEPTIONS.includes(key)) missing.push(key);
      }
    }
    expect(missing).toEqual([]);
  });

  it("content tables with sourceId have a (campaignId, sourceId) index", () => {
    const expected = [
      "Unit", "Spell", "SpellGroup", "Artifact", "ArtifactSet", "SkillTree", "CampaignTrack",
      "Skill", "Race", "GameClass", "Feat", "Background", "MainSkill",
    ];

    const models = parseModels(SCHEMA);

    const missing = expected.filter(
      (name) =>
        !(models.get(name) ?? []).some((l) =>
          /^@@index\(\s*\[campaignId,\s*sourceId\]/.test(l),
        ),
    );

    expect(missing).toEqual([]);
  });
});
