#!/usr/bin/env tsx
/**
 * Перейменовує бойові треки бібліотеки в «<Раса> - Битва N» (група «Битва» виводиться з назви;
 * номер лише коли в раси кілька битв). Ідемпотентно; за замовчуванням лише показує зміни.
 *
 *   pnpm rename-battle-tracks [campaignId] [--apply] [--allow-remote]
 */
import { assertSeedTarget } from "../seed/seed-library-lib";

import { prisma } from "@/lib/db";
import { planBattleTitles } from "@/lib/utils/audio/battle-titles";

async function main() {
  const args = process.argv.slice(2);

  const apply = args.includes("--apply");

  const [campaignId] = args.filter((a) => !a.startsWith("--"));

  const host = assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

  console.info(`БД: ${host}${apply ? "" : " (dry-run: додайте --apply, щоб записати)"}${campaignId ? `, кампанія ${campaignId}` : ", усі кампанії"}`);

  const rows = await prisma.campaignTrack.findMany({
    where: campaignId ? { campaignId } : {},
    orderBy: [{ campaignId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, campaignId: true, title: true },
  });

  const campaigns = [...new Set(rows.map((r) => r.campaignId))];

  let changed = 0;

  for (const id of campaigns) {
    const changes = planBattleTitles(rows.filter((r) => r.campaignId === id));

    if (changes.length === 0) continue;

    console.info(`\nКампанія ${id}: ${changes.length} змін`);

    for (const c of changes) console.info(`  ${c.from}  →  ${c.to}`);

    if (apply) await prisma.$transaction(changes.map((c) => prisma.campaignTrack.update({ where: { id: c.id }, data: { title: c.to } })));

    changed += changes.length;
  }

  console.info(`\n${apply ? "Перейменовано" : "Буде перейменовано"}: ${changed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
