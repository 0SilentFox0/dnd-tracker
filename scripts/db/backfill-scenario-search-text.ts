#!/usr/bin/env tsx
/**
 * Перераховує scenario_pages.searchText = buildSearchText(title, content) для всіх сторінок.
 * Потрібно для сторінок, імпортованих до виправлення bundle.ts (searchText = лише назва) і для NFC-нормалізації.
 * Ідемпотентно: оновлює лише рядки, де значення змінилось. Вміст сторінок не виводить.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/backfill-scenario-search-text.ts [--dry-run] [--allow-remote]
 */
import { prisma } from "@/lib/db";
import { scenarioContentSchema } from "@/lib/schemas/scenario";
import { buildSearchText } from "@/lib/utils/scenario/search-text";
import { emptyContent } from "@/lib/utils/scenario/structure";
import { assertSeedTarget } from "@/scripts/seed/seed-library-lib";

const BATCH = 50;

async function main() {
  const args = process.argv.slice(2);

  const dryRun = args.includes("--dry-run");

  const host = assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

  console.log(`БД: ${host}${dryRun ? " · DRY RUN" : ""}`);

  let cursor: string | undefined;

  let scanned = 0;

  let changed = 0;

  for (;;) {
    const pages = await prisma.scenarioPage.findMany({
      take: BATCH,
      orderBy: { id: "asc" },
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: { id: true, title: true, content: true, searchText: true },
    });

    if (pages.length === 0) break;

    for (const p of pages) {
      const next = buildSearchText(p.title, scenarioContentSchema.safeParse(p.content).data ?? emptyContent());

      scanned++;

      if (next === p.searchText) continue;

      changed++;

      if (!dryRun) await prisma.scenarioPage.update({ where: { id: p.id }, data: { searchText: next } });
    }

    cursor = pages[pages.length - 1].id;
  }

  console.log(`сторінок: ${scanned} · ${dryRun ? "змінив би" : "оновлено"}: ${changed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
