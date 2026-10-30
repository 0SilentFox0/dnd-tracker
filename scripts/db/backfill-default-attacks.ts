#!/usr/bin/env tsx
/**
 * Кампаніям без rules.defaultAttacks, чий ДМ має locale "uk", проставляє українські назви базових атак
 * (інакше після i18n вони б мали англійські). en/null locale не чіпає. Ідемпотентно.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/db/backfill-default-attacks.ts [--apply] [--allow-remote]
 *   Без --apply — лише підрахунок (dry-run).
 */
import { prisma } from "@/lib/db";
import { assertSeedTarget } from "@/scripts/seed/seed-library-lib";

const UK_DEFAULT_ATTACKS = { meleeName: "Звичайний удар", rangedName: "Звичайний постріл", weaponName: "Зброя" };

async function main() {
  const args = process.argv.slice(2);

  const apply = args.includes("--apply");

  const host = assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

  console.log(`БД: ${host}${apply ? "" : " · DRY RUN"}`);

  const campaigns = await prisma.campaign.findMany({
    where: { dm: { locale: "uk" } },
    select: { id: true, rules: true },
  });

  let changed = 0;

  for (const c of campaigns) {
    const rules = c.rules && typeof c.rules === "object" && !Array.isArray(c.rules) ? (c.rules as Record<string, unknown>) : {};

    const existing = rules.defaultAttacks as Record<string, unknown> | undefined;

    if (existing !== undefined && "weaponName" in existing) continue;

    changed++;

    if (apply) await prisma.campaign.update({ where: { id: c.id }, data: { rules: { ...rules, defaultAttacks: { ...UK_DEFAULT_ATTACKS, ...existing, weaponName: UK_DEFAULT_ATTACKS.weaponName } } } });
  }

  console.log(`кампаній (ДМ uk): ${campaigns.length} · ${apply ? "оновлено" : "оновив би"}: ${changed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
