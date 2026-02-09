/**
 * Скрипт для додавання іконок до артефактів-зброї.
 * Іконки з game-icons.net (CC BY 3.0, автори: lorc, delapouite, carl-olsen, skoll)
 *
 * Запуск: npx tsx scripts/update-artifact-icons.ts <campaignId>
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE = "https://game-icons.net/icons/ffffff/000000/1x1";

const WEAPON_ICONS: Record<string, string> = {
  // --- Ближній бій ---
  "Довгий меч": `${BASE}/lorc/crossed-swords.svg`,
  "Короткий меч": `${BASE}/skoll/gladius.svg`,
  "Сокира": `${BASE}/lorc/battle-axe.svg`,
  "Бойовий молот": `${BASE}/delapouite/warhammer.svg`,
  "Булава": `${BASE}/delapouite/flanged-mace.svg`,
  "Палиця": `${BASE}/delapouite/wood-club.svg`,
  "Кинджал": `${BASE}/lorc/dripping-knife.svg`,
  "Глефа": `${BASE}/lorc/grapple.svg`,
  "Алебарда": `${BASE}/lorc/halberd-shuriken.svg`,
  "Спис": `${BASE}/lorc/barbed-spear.svg`,
  "Ратуш": `${BASE}/delapouite/bo.svg`,
  "Батіг": `${BASE}/lorc/whip.svg`,
  "Рапіра": `${BASE}/lorc/stiletto.svg`,
  "Шабля": `${BASE}/lorc/sparkling-sabre.svg`,
  "Дворучний меч": `${BASE}/lorc/winged-sword.svg`,
  "Дворучна сокира": `${BASE}/delapouite/sharp-axe.svg`,
  "Моргенштерн": `${BASE}/lorc/spiked-mace.svg`,
  "Ціп": `${BASE}/delapouite/flail.svg`,
  "Трезубець": `${BASE}/lorc/trident.svg`,
  "Серп": `${BASE}/lorc/scythe.svg`,
  // --- Дальній бій ---
  "Короткий лук": `${BASE}/lorc/pocket-bow.svg`,
  "Довгий лук": `${BASE}/delapouite/bow-arrow.svg`,
  "Легкий арбалет": `${BASE}/carl-olsen/crossbow.svg`,
  "Важкий арбалет": `${BASE}/carl-olsen/crossbow.svg`,
  "Ручний арбалет": `${BASE}/carl-olsen/crossbow.svg`,
  "Праща": `${BASE}/delapouite/sling.svg`,
  "Дротик": `${BASE}/lorc/heavy-arrow.svg`,
  "Метальна сокира": `${BASE}/delapouite/tomahawk.svg`,
  "Метальний ніж": `${BASE}/lorc/backstab.svg`,
  "Духова трубка": `${BASE}/delapouite/bo.svg`,
};

async function main() {
  const campaignId = process.argv[2];

  if (!campaignId) {
    console.error("Використання: npx tsx scripts/update-artifact-icons.ts <campaignId>");
    process.exit(1);
  }

  const artifacts = await prisma.artifact.findMany({
    where: { campaignId },
  });

  let updated = 0;

  for (const artifact of artifacts) {
    const iconUrl = WEAPON_ICONS[artifact.name];

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
