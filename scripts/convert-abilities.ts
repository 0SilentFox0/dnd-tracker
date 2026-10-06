import { Prisma, PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { AbilitiesSchema } from "../lib/utils/abilities/schema";
import { specialAbilitiesToAbilities } from "../lib/utils/units/special-abilities";
import { convertLegacyArtifact } from "./legacy-convert/convert-artifact";
import { convertLegacyArtifactSet } from "./legacy-convert/convert-artifact-set";
import { convertLegacyRace } from "./legacy-convert/convert-race";
import { convertLegacySkill } from "./legacy-convert/convert-skill";
import { buildConversionReport, type ReportRow } from "./legacy-convert/report";
import type { ConversionResult } from "./legacy-convert/types";

const args = process.argv.slice(2);

// .env.local за замовчуванням; для prod — --env .env.production-db.local
config({ path: args.includes("--env") ? args[args.indexOf("--env") + 1] : ".env.local" });

const prisma = new PrismaClient();

const campaignId = args.includes("--campaign") ? args[args.indexOf("--campaign") + 1] : undefined;

const mode = args.includes("--force") ? "force" : args.includes("--apply") ? "apply" : "dry-run";

// legacy-колонок уже немає в schema.prisma, але в БД вони є до релізу 2
const byCampaign = campaignId ? Prisma.sql`WHERE "campaignId" = ${campaignId}` : Prisma.empty;

type Model = "skill" | "race" | "artifact" | "artifactSet" | "unit";

type Base = { id: string; name: string; campaignId: string; abilities: unknown };

async function main() {
  const rows: (ReportRow & { hasAbilities: boolean })[] = [];

  const push = (kind: Model, row: Base, result: ConversionResult) =>
    rows.push({ kind, id: row.id, name: row.name, campaignId: row.campaignId, result, valid: AbilitiesSchema.safeParse(result.abilities).success, hasAbilities: row.abilities !== null });

  const skills = await prisma.$queryRaw<(Base & { combatStats: unknown; bonuses: unknown; skillTriggers: unknown; spellGroupId: string | null })[]>`
    SELECT id, name, "campaignId", abilities, "combatStats", bonuses, "skillTriggers", "spellGroupId" FROM skills ${byCampaign}`;

  for (const r of skills) push("skill", r, convertLegacySkill(r));

  const races = await prisma.$queryRaw<(Base & { passiveAbility: unknown })[]>`
    SELECT id, name, "campaignId", abilities, "passiveAbility" FROM races ${byCampaign}`;

  for (const r of races) push("race", r, convertLegacyRace(r));

  const artifacts = await prisma.$queryRaw<(Base & { bonuses: unknown; modifiers: unknown; passiveAbility: unknown; slot: string })[]>`
    SELECT id, name, "campaignId", abilities, bonuses, modifiers, "passiveAbility", slot FROM artifacts ${byCampaign}`;

  for (const r of artifacts) push("artifact", r, convertLegacyArtifact(r));

  const sets = await prisma.$queryRaw<(Base & { setBonus: unknown })[]>`
    SELECT id, name, "campaignId", abilities, "setBonus" FROM artifact_sets ${byCampaign}`;

  for (const r of sets) push("artifactSet", r, convertLegacyArtifactSet(r));

  const units = await prisma.$queryRaw<(Base & { specialAbilities: unknown })[]>`
    SELECT id, name, "campaignId", abilities, "specialAbilities" FROM units ${byCampaign}`;

  for (const r of units) push("unit", r, { abilities: specialAbilitiesToAbilities(r.specialAbilities), issues: [] });

  const date = new Date().toISOString().slice(0, 10);

  mkdirSync(join(process.cwd(), "docs/reports"), { recursive: true });

  const path = join(process.cwd(), `docs/reports/abilities-conversion-${date}.md`);

  writeFileSync(path, buildConversionReport(rows, { date, mode }));

  let written = 0;

  if (mode !== "dry-run") {
    for (const r of rows) {
      if (!r.valid || (mode === "apply" && r.hasAbilities)) continue;

      const data = { abilities: r.result.abilities as object };

      const whereId = { where: { id: r.id }, data };

      if (r.kind === "skill") await prisma.skill.update(whereId);
      else if (r.kind === "race") await prisma.race.update(whereId);
      else if (r.kind === "artifact") await prisma.artifact.update(whereId);
      else if (r.kind === "artifactSet") await prisma.artifactSet.update(whereId);
      else await prisma.unit.update(whereId);

      written++;
    }
  }

  console.info(`Звіт: ${path}; рядків: ${rows.length}; записано: ${written} (${mode})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
