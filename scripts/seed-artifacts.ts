/**
 * Скрипт для додавання артефактів-зброї (ближній та дальній бій) без бонусів.
 *
 * Запуск: npx tsx scripts/seed-artifacts.ts <campaignId>
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ArtifactSeed {
  name: string;
  description: string;
  slot: string;
  rarity: string;
}

const MELEE_WEAPONS: ArtifactSeed[] = [
  { name: "Довгий меч", description: "Класичний одноручний меч з подвійним лезом.", slot: "weapon", rarity: "common" },
  { name: "Короткий меч", description: "Легкий та швидкий одноручний меч.", slot: "weapon", rarity: "common" },
  { name: "Сокира", description: "Бойова сокира з широким лезом.", slot: "weapon", rarity: "common" },
  { name: "Бойовий молот", description: "Важкий молот для потужних ударів.", slot: "weapon", rarity: "common" },
  { name: "Булава", description: "Ударна зброя з масивною головкою.", slot: "weapon", rarity: "common" },
  { name: "Палиця", description: "Проста дерев'яна палиця.", slot: "weapon", rarity: "common" },
  { name: "Кинджал", description: "Короткий клинок для ближнього бою та метання.", slot: "weapon", rarity: "common" },
  { name: "Глефа", description: "Довга древкова зброя з клинком на кінці.", slot: "weapon", rarity: "common" },
  { name: "Алебарда", description: "Древкова зброя з сокирою та списом.", slot: "weapon", rarity: "common" },
  { name: "Спис", description: "Довга колюча зброя з наконечником.", slot: "weapon", rarity: "common" },
  { name: "Ратуш", description: "Довге дворучне древко з металевим наконечником.", slot: "weapon", rarity: "common" },
  { name: "Батіг", description: "Гнучка зброя великої дальності ближнього бою.", slot: "weapon", rarity: "common" },
  { name: "Рапіра", description: "Тонкий та витончений колючий меч.", slot: "weapon", rarity: "common" },
  { name: "Шабля", description: "Вигнутий меч для рубних ударів.", slot: "weapon", rarity: "common" },
  { name: "Дворучний меч", description: "Великий та важкий дворучний меч.", slot: "weapon", rarity: "common" },
  { name: "Дворучна сокира", description: "Масивна сокира, що тримається двома руками.", slot: "weapon", rarity: "common" },
  { name: "Моргенштерн", description: "Булава з шипами на кулі.", slot: "weapon", rarity: "common" },
  { name: "Ціп", description: "Ударна зброя на ланцюгу.", slot: "weapon", rarity: "common" },
  { name: "Трезубець", description: "Триконечна колюча зброя.", slot: "weapon", rarity: "common" },
  { name: "Серп", description: "Вигнутий клинок, спочатку сільськогосподарський інструмент.", slot: "weapon", rarity: "common" },
];

const RANGED_WEAPONS: ArtifactSeed[] = [
  { name: "Короткий лук", description: "Компактний лук для швидкої стрільби.", slot: "weapon", rarity: "common" },
  { name: "Довгий лук", description: "Потужний лук великої дальності.", slot: "weapon", rarity: "common" },
  { name: "Легкий арбалет", description: "Одноручний арбалет для швидкої стрільби.", slot: "weapon", rarity: "common" },
  { name: "Важкий арбалет", description: "Потужний дворучний арбалет.", slot: "weapon", rarity: "common" },
  { name: "Ручний арбалет", description: "Мініатюрний арбалет, що стріляє однією рукою.", slot: "weapon", rarity: "common" },
  { name: "Праща", description: "Проста метальна зброя з каменями.", slot: "weapon", rarity: "common" },
  { name: "Дротик", description: "Легкий метальний снаряд.", slot: "weapon", rarity: "common" },
  { name: "Метальна сокира", description: "Легка сокира для метання.", slot: "weapon", rarity: "common" },
  { name: "Метальний ніж", description: "Збалансований ніж для точного метання.", slot: "weapon", rarity: "common" },
  { name: "Духова трубка", description: "Тиха зброя, що стріляє отруєними голками.", slot: "weapon", rarity: "common" },
];

async function main() {
  const campaignId = process.argv[2];

  if (!campaignId) {
    console.error("Використання: npx tsx scripts/seed-artifacts.ts <campaignId>");
    process.exit(1);
  }

  // Перевіряємо, що кампанія існує
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    console.error(`Кампанію з id "${campaignId}" не знайдено.`);
    process.exit(1);
  }

  console.log(`Додаю артефакти до кампанії "${campaign.name}" (${campaignId})...`);

  const allWeapons = [...MELEE_WEAPONS, ...RANGED_WEAPONS];

  let created = 0;
  let skipped = 0;

  for (const weapon of allWeapons) {
    // Перевіряємо, чи артефакт з такою назвою вже існує
    const existing = await prisma.artifact.findFirst({
      where: {
        campaignId,
        name: weapon.name,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.artifact.create({
      data: {
        campaignId,
        name: weapon.name,
        description: weapon.description,
        slot: weapon.slot,
        rarity: weapon.rarity,
        bonuses: {},
        modifiers: [],
      },
    });

    created++;
  }

  console.log(`Готово! Створено: ${created}, пропущено (вже існують): ${skipped}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
