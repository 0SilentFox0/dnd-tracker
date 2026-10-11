#!/usr/bin/env tsx
/**
 * Оновлює лише ініціативу юнітів кампанії за бібліотекою (data/library/units), зіставляючи за назвою.
 * Інші поля юнітів не змінює. Лише локальна БД без --allow-remote.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/sync-unit-initiative.ts <campaignId> [--dry-run] [--allow-remote]
 */
import { buildLibrary } from "../data/library/build";
import { prisma } from "../lib/db";
import { assertSeedTarget, parseArgs } from "./seed-library-lib";

async function main() {
  const { campaignId, dryRun, allowRemote } = parseArgs(process.argv.slice(2));

  const host = assertSeedTarget(process.env.DATABASE_URL, allowRemote);

  const initiativeByName = new Map(buildLibrary().units.map((u) => [u.name, u.initiative]));

  const units = await prisma.unit.findMany({ where: { campaignId }, select: { id: true, name: true, initiative: true } });

  console.log(`БД: ${host} · кампанія ${campaignId} · юнітів ${units.length}${dryRun ? " · DRY RUN" : ""}`);

  let changed = 0;

  for (const u of units) {
    const next = initiativeByName.get(u.name);

    if (next === undefined || next === u.initiative) continue;

    changed++;
    console.log(`${u.name}: ${u.initiative} → ${next}`);

    if (!dryRun) await prisma.unit.update({ where: { id: u.id }, data: { initiative: next } });
  }

  console.log(`${dryRun ? "змінив би" : "змінено"}: ${changed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
