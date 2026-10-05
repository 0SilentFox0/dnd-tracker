import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { convertLegacyArtifact } from "../lib/utils/abilities/legacy/convert-artifact";
import { convertLegacyArtifactSet } from "../lib/utils/abilities/legacy/convert-artifact-set";
import { convertLegacyRace } from "../lib/utils/abilities/legacy/convert-race";
import { convertLegacySkill } from "../lib/utils/abilities/legacy/convert-skill";
import { convertLegacyUnit } from "../lib/utils/abilities/legacy/convert-unit";
import { buildConversionReport, type ReportRow } from "../lib/utils/abilities/legacy/report";
import type { ConversionResult } from "../lib/utils/abilities/legacy/types";
import { AbilitiesSchema } from "../lib/utils/abilities/schema";

const args = process.argv.slice(2);

// .env.local за замовчуванням; для prod — --env .env.production-db.local
config({ path: args.includes("--env") ? args[args.indexOf("--env") + 1] : ".env.local" });

const prisma = new PrismaClient();

const campaignId = args.includes("--campaign") ? args[args.indexOf("--campaign") + 1] : undefined;

const mode = args.includes("--force") ? "force" : args.includes("--apply") ? "apply" : "dry-run";

const where = campaignId ? { campaignId } : {};

type Model = "skill" | "race" | "artifact" | "artifactSet" | "unit";

async function main() {
  const rows: (ReportRow & { hasAbilities: boolean })[] = [];

  const push = (kind: Model, row: { id: string; name: string; campaignId: string; abilities: unknown }, result: ConversionResult) =>
    rows.push({ kind, id: row.id, name: row.name, campaignId: row.campaignId, result, valid: AbilitiesSchema.safeParse(result.abilities).success, hasAbilities: row.abilities !== null });

  for (const r of await prisma.skill.findMany({ where, select: { id: true, name: true, campaignId: true, abilities: true, combatStats: true, bonuses: true, skillTriggers: true, spellGroupId: true } })) push("skill", r, convertLegacySkill(r));

  for (const r of await prisma.race.findMany({ where, select: { id: true, name: true, campaignId: true, abilities: true, passiveAbility: true } })) push("race", r, convertLegacyRace(r));

  for (const r of await prisma.artifact.findMany({ where, select: { id: true, name: true, campaignId: true, abilities: true, bonuses: true, modifiers: true, passiveAbility: true, slot: true } })) push("artifact", r, convertLegacyArtifact(r));

  for (const r of await prisma.artifactSet.findMany({ where, select: { id: true, name: true, campaignId: true, abilities: true, setBonus: true } })) push("artifactSet", r, convertLegacyArtifactSet(r));

  for (const r of await prisma.unit.findMany({ where, select: { id: true, name: true, campaignId: true, abilities: true, specialAbilities: true } })) push("unit", r, convertLegacyUnit(r));

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
