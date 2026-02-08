#!/usr/bin/env tsx
/**
 * Import spells from docs/SPELLS.csv (format: Spell_Name, Level, Spell_School, etc.)
 * Creates spell groups by school and spells with icon (Image URL).
 *
 * Usage: pnpm run import-docs-spells [campaignId]
 * Default campaignId from lib/constants/campaigns.ts if omitted.
 */

import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

import { DEFAULT_CAMPAIGN_ID } from "../lib/constants/campaigns";
import {
  parseDocsSpellRow,
  type DocsSpellRow,
} from "../lib/utils/spells/spell-csv-docs-parser";

const prisma = new PrismaClient();

function parseDiceFromDamageDice(damageDice: string | undefined): {
  diceCount: number | null;
  diceType: string | null;
} {
  if (!damageDice || !damageDice.trim()) {
    return { diceCount: null, diceType: null };
  }
  const match = damageDice.trim().match(/^(\d+)\s*d(\d+)/i);
  if (!match) return { diceCount: null, diceType: null };
  const count = parseInt(match[1], 10);
  const type = `d${match[2]}`;
  return { diceCount: count, diceType: type };
}

async function getOrCreateSpellGroup(
  campaignId: string,
  schoolName: string
): Promise<string> {
  const existing = await prisma.spellGroup.findFirst({
    where: { campaignId, name: schoolName },
  });
  if (existing) return existing.id;
  const group = await prisma.spellGroup.create({
    data: { campaignId, name: schoolName },
  });
  return group.id;
}

async function main() {
  const campaignId = process.argv[2] || DEFAULT_CAMPAIGN_ID;
  const csvPath = path.join(process.cwd(), "docs", "SPELLS.csv");

  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as DocsSpellRow[];

  const spells = records.map((row) => parseDocsSpellRow(row));
  const uniqueSchools = [...new Set(spells.map((s) => s.school).filter(Boolean))] as string[];
  const spellGroups: Record<string, string> = {};

  for (const school of uniqueSchools) {
    spellGroups[school] = await getOrCreateSpellGroup(campaignId, school);
  }

  const existingNames = await prisma.spell.findMany({
    where: {
      campaignId,
      name: { in: spells.map((s) => s.name) },
    },
    select: { name: true },
  });
  const existingSet = new Set(existingNames.map((s) => s.name));

  const toCreate = spells
    .filter((s) => !existingSet.has(s.name))
    .map((s) => {
      const { diceCount, diceType } = parseDiceFromDamageDice(s.damageDice);
      return {
        campaignId,
        name: s.name,
        level: s.level,
        type: s.type,
        damageType: s.damageType,
        damageElement: s.damageElement ?? null,
        castingTime: s.castingTime ?? null,
        range: s.range ?? null,
        components: null,
        duration: s.duration ?? null,
        concentration: s.concentration ?? false,
        diceCount,
        diceType,
        savingThrow:
          s.savingThrowAbility != null
            ? { ability: s.savingThrowAbility, onSuccess: s.savingThrowOnSuccess ?? "half" }
            : undefined,
        description: s.description,
        icon: s.icon ?? null,
        groupId: (s.school && spellGroups[s.school]) ?? null,
      };
    });

  if (toCreate.length === 0) {
    console.log(`No new spells to import (all ${spells.length} already exist).`);
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.spell.createMany({
    data: toCreate,
    skipDuplicates: true,
  });

  console.log(
    `Imported ${result.count} spells from docs/SPELLS.csv (campaign: ${campaignId}). Skipped ${spells.length - toCreate.length} duplicates.`
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
