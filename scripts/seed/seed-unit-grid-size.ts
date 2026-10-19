#!/usr/bin/env tsx
/**
 * Оновлює лише units.gridSize юнітів кампанії за бібліотекою (data/library), інші поля й таблиці не чіпає.
 *
 *   pnpm seed-unit-grid-size <campaignId> [--dry-run] [--allow-remote]
 */
import { assertSeedTarget, findByName, parseArgs } from "./seed-library-lib";

import { LIBRARY_SOURCE } from "@/data/library/build";
import { prisma } from "@/lib/db";

async function main() {
  const { campaignId, dryRun, allowRemote } = parseArgs(process.argv.slice(2));

  const host = assertSeedTarget(process.env.DATABASE_URL, allowRemote);

  console.info(`БД: ${host}${dryRun ? " (dry-run)" : ""}, кампанія ${campaignId}`);

  const rows = await prisma.unit.findMany({ where: { campaignId }, select: { id: true, name: true, gridSize: true } });

  let changed = 0;

  const missing: string[] = [];

  for (const unit of LIBRARY_SOURCE.units) {
    const row = findByName(rows, unit.name);

    if (!row) {
      missing.push(unit.name);
      continue;
    }

    const gridSize = unit.gridSize ?? 1;

    if (row.gridSize === gridSize) continue;

    changed++;
    console.info(`${row.name}: ${row.gridSize} → ${gridSize}`);

    if (!dryRun) await prisma.unit.update({ where: { id: row.id }, data: { gridSize } });
  }

  console.info(`Змінено: ${changed}, без змін: ${LIBRARY_SOURCE.units.length - changed - missing.length}, не знайдено в кампанії: ${missing.length}`);

  if (missing.length) console.info(`Не знайдено: ${missing.join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
