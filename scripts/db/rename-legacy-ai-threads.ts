#!/usr/bin/env tsx
/**
 * AI-треди зі старою авто-назвою «Новий тред» → порожня назва (UI показує thread.untitled; title не nullable, "" — звичайний «без назви»).
 * Ідемпотентно. Після запуску на проді можна прибрати LEGACY_THREAD_TITLE з lib/constants/ai.ts.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/rename-legacy-ai-threads.ts [--apply] [--allow-remote]
 *   Без --apply — лише підрахунок (dry-run).
 */
import { LEGACY_THREAD_TITLE } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";
import { assertSeedTarget } from "@/scripts/seed/seed-library-lib";

async function main() {
  const args = process.argv.slice(2);

  const apply = args.includes("--apply");

  const host = assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

  console.log(`БД: ${host}${apply ? "" : " · DRY RUN"}`);

  const where = { title: LEGACY_THREAD_TITLE };

  const count = apply ? (await prisma.aiThread.updateMany({ where, data: { title: "" } })).count : await prisma.aiThread.count({ where });

  console.log(`тредів «${LEGACY_THREAD_TITLE}»: ${count} · ${apply ? "оновлено" : "оновив би"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
