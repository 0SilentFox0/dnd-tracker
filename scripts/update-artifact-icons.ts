/**
 * Скрипт для додавання іконок до артефактів (зброя, шоломи, броня, черевики).
 * Використовує мапу з artifact-icon-map.ts.
 *
 * Запуск: npx tsx scripts/update-artifact-icons.ts [campaignId]
 */

import { PrismaClient } from "@prisma/client";

import { ARTIFACT_ICONS } from "./artifact-icon-map";

import { DEFAULT_CAMPAIGN_ID } from "@/lib/constants";

const prisma = new PrismaClient();

async function main() {
  const campaignId = process.argv[2] || DEFAULT_CAMPAIGN_ID;

  if (!campaignId) {
    console.error(
      "Використання: npx tsx scripts/update-artifact-icons.ts <campaignId>",
    );
    process.exit(1);
  }

  const artifacts = await prisma.artifact.findMany({
    where: { campaignId },
  });

  let updated = 0;

  for (const artifact of artifacts) {
    const iconUrl = ARTIFACT_ICONS[artifact.name];

    if (iconUrl && !artifact.icon) {
      await prisma.artifact.update({
        where: { id: artifact.id },
        data: { icon: iconUrl },
      });

      updated++;
      console.log(`  ✓ ${artifact.name}`);
    }
  }

  console.log(`\nГотово! Оновлено іконок: ${updated}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
