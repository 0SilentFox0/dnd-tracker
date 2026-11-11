#!/usr/bin/env tsx
/**
 * Генерує моделі `<Model>Base` (базове сховище опублікованих версій шаблону) з 14 контентних моделей
 * і вставляє їх у prisma/schema.prisma між маркерами. Ідемпотентно.
 *
 *   pnpm exec tsx scripts/db/gen-base-models.ts
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const CONTENT_MODELS = [
  "Unit",
  "Spell",
  "SpellGroup",
  "Artifact",
  "ArtifactSet",
  "SkillTree",
  "CampaignTrack",
  "Skill",
  "Race",
  "GameClass",
  "Feat",
  "Background",
  "MainSkill",
  "Career",
] as const;

const BEGIN = "// BEGIN GENERATED BASE MODELS (scripts/db/gen-base-models.ts)";

const END = "// END GENERATED BASE MODELS";

const DROPPED = new Set(["campaignId", "sourceId", "sourceHash"]);

const VERSION_FIELDS = ["sourceCampaignId String", "validFrom Int", "validTo Int?"];

function modelBlocks(schema: string): Map<string, string[]> {
  const blocks = new Map<string, string[]>();

  for (const match of schema.matchAll(/^model (\w+) \{\n([\s\S]*?)^\}/gm)) {
    blocks.set(match[1], match[2].split("\n"));
  }

  return blocks;
}

function baseModel(name: string, lines: string[], modelNames: Set<string>): string {
  const fields: string[] = [];

  let table = "";

  for (const line of lines) {
    const trimmed = line.trim();

    const map = trimmed.match(/^@@map\("(.+)"\)/);

    if (map) table = map[1];

    if (!trimmed || trimmed.startsWith("@@") || trimmed.startsWith("//")) continue;

    const field = trimmed.match(/^(\w+)\s+([\w]+)([?[\]]*)\s*(.*)$/);

    if (!field) continue;

    const [, fieldName, type, modifiers, rest] = field;

    if (DROPPED.has(fieldName) || modelNames.has(type) || rest.includes("@relation")) continue;

    const noUpdated = rest.replace(/@updatedAt\s*/, "");

    const cleaned = fieldName === "id" ? noUpdated.replace(/@id\s*/, "").replace(/@default\((?:[^()]|\([^()]*\))*\)\s*/, "") : noUpdated;

    fields.push(`${fieldName} ${type}${modifiers} ${cleaned}`.trim());
  }

  if (!table) throw new Error(`${name}: no @@map`);

  const body = [...fields, ...VERSION_FIELDS].map((f) => `  ${f}`).join("\n");

  const slugIndex = fields.some((f) => f.startsWith("slug ")) ? ["  @@index([sourceCampaignId, slug])"] : [];

  return [
    `model ${name}Base {`,
    body,
    "",
    "  @@id([id, validFrom])",
    "  @@index([sourceCampaignId, validFrom, validTo])",
    ...slugIndex,
    `  @@map("${table}_base")`,
    "}",
  ].join("\n");
}

export function generateBaseModels(schema: string): string {
  const blocks = modelBlocks(schema);

  const modelNames = new Set(blocks.keys());

  return CONTENT_MODELS.map((name) => {
    const lines = blocks.get(name);

    if (!lines) throw new Error(`model ${name} not found`);

    return baseModel(name, lines, modelNames);
  }).join("\n\n");
}

export function applyGenerated(schema: string): string {
  const start = schema.indexOf(BEGIN);

  const end = schema.indexOf(END);

  const source = (start === -1 ? schema : `${schema.slice(0, start)}${schema.slice(end + END.length)}`).trimEnd();

  return `${source}\n\n${BEGIN}\n\n${generateBaseModels(source)}\n\n${END}\n`;
}

function main() {
  const file = path.join(process.cwd(), "prisma/schema.prisma");

  writeFileSync(file, applyGenerated(readFileSync(file, "utf8")));
  execSync("pnpm exec prisma format", { stdio: "inherit" });
}

if (process.argv[1]?.endsWith("gen-base-models.ts")) main();
