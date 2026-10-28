#!/usr/bin/env tsx
// pnpm constructor:backfill <campaignId|--all> [--dry-run] [--allow-remote]
import type { Prisma } from "@prisma/client";

import { assertSeedTarget } from "../seed/seed-library-lib";
import { type CampaignRows, type Change, planBackfill } from "./backfill/plan";

import { prisma } from "@/lib/db";

async function loadRows(campaignId: string): Promise<CampaignRows> {
  const [spells, spellGroups, mainSkills, races, units, characters] = await Promise.all([
    prisma.spell.findMany({ where: { campaignId }, select: { id: true, name: true, fx: true } }),
    prisma.spellGroup.findMany({ where: { campaignId }, select: { id: true, name: true, color: true, icon: true } }),
    prisma.mainSkill.findMany({ where: { campaignId }, select: { id: true, name: true, role: true } }),
    prisma.race.findMany({ where: { campaignId }, select: { id: true, name: true, abilities: true, passiveAbility: true } }),
    prisma.unit.findMany({ where: { campaignId }, select: { id: true, name: true, abilities: true } }),
    prisma.character.findMany({ where: { campaignId }, select: { name: true, personalSkillId: true } }),
  ]);

  const withSkill = characters.flatMap((c) => (c.personalSkillId ? [{ name: c.name, skillId: c.personalSkillId }] : []));

  const skills = await prisma.skill.findMany({
    where: { id: { in: withSkill.map((c) => c.skillId) } },
    select: { id: true, abilities: true },
  });

  const personalSkills = withSkill.map((c) => ({
    id: c.skillId,
    characterName: c.name,
    abilities: skills.find((s) => s.id === c.skillId)?.abilities ?? [],
  }));

  return {
    spells,
    spellGroups,
    mainSkills,
    races,
    units,
    personalSkills,
    charactersWithoutPersonalSkill: characters.filter((c) => !c.personalSkillId).map((c) => c.name),
  };
}

function toUpdate(c: Change) {
  switch (c.table) {
    case "spell": return prisma.spell.update({ where: { id: c.id }, data: { fx: c.data.fx as Prisma.InputJsonObject } });
    case "spellGroup": return prisma.spellGroup.update({ where: { id: c.id }, data: c.data });
    case "mainSkill": return prisma.mainSkill.update({ where: { id: c.id }, data: c.data });
    case "race": return prisma.race.update({ where: { id: c.id }, data: { abilities: c.data.abilities as Prisma.InputJsonArray } });
    case "unit": return prisma.unit.update({ where: { id: c.id }, data: { abilities: c.data.abilities as Prisma.InputJsonArray } });
    case "skill": return prisma.skill.update({ where: { id: c.id }, data: { abilities: c.data.abilities as Prisma.InputJsonArray } });
  }
}

async function main() {
  const args = process.argv.slice(2);

  const dryRun = args.includes("--dry-run");

  assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

  const target = args.find((a) => !a.startsWith("--"));

  const ids = args.includes("--all")
    ? (await prisma.campaign.findMany({ select: { id: true } })).map((c) => c.id)
    : target ? [target] : [];

  if (ids.length === 0) throw new Error("usage: constructor:backfill <campaignId|--all> [--dry-run]");

  for (const campaignId of ids) {
    const { changes, warnings } = planBackfill(await loadRows(campaignId));

    console.log(`\n${campaignId}: ${changes.length} змін`);
    for (const c of changes) console.log(`  ${c.table} ${c.id} ${"reason" in c ? c.reason : JSON.stringify(c.data)}`);
    for (const w of warnings) console.warn(`  ⚠ ${w}`);

    if (dryRun || changes.length === 0) continue;

    await prisma.$transaction(changes.map(toUpdate));
  }

  console.log("\nКеш довідників оновиться протягом 300 с (скрипт не інвалідує Next data cache).");
}

main().finally(() => prisma.$disconnect());
