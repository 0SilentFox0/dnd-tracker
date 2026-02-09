/**
 * Скрипт для заповнення артефактів кампанії: зброя (ближній/дальній бій), шоломи, броня, черевики.
 * Пропускає артефакти, які вже є в кампанії (за назвою).
 *
 * Запуск:
 *   pnpm run seed-artifacts              — використає DEFAULT_CAMPAIGN_ID
 *   pnpm run seed-artifacts <campaignId> — або: npx tsx scripts/seed-artifacts.ts <campaignId>
 */

import { PrismaClient } from "@prisma/client";

import { DEFAULT_CAMPAIGN_ID } from "../lib/constants/campaigns";
import { ARTIFACT_ICONS } from "./artifact-icon-map";

const prisma = new PrismaClient();

interface ArtifactSeed {
  name: string;
  description: string;
  slot: string;
  rarity: string;
}

const MELEE_WEAPONS: ArtifactSeed[] = [
  {
    name: "Довгий меч",
    description: "Класичний одноручний меч з подвійним лезом.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Короткий меч",
    description: "Легкий та швидкий одноручний меч.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Сокира",
    description: "Бойова сокира з широким лезом.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Бойовий молот",
    description: "Важкий молот для потужних ударів.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Булава",
    description: "Ударна зброя з масивною головкою.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Палиця",
    description: "Проста дерев'яна палиця.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Кинджал",
    description: "Короткий клинок для ближнього бою та метання.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Глефа",
    description: "Довга древкова зброя з клинком на кінці.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Алебарда",
    description: "Древкова зброя з сокирою та списом.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Спис",
    description: "Довга колюча зброя з наконечником.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Ратуш",
    description: "Довге дворучне древко з металевим наконечником.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Батіг",
    description: "Гнучка зброя великої дальності ближнього бою.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Рапіра",
    description: "Тонкий та витончений колючий меч.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Шабля",
    description: "Вигнутий меч для рубних ударів.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Дворучний меч",
    description: "Великий та важкий дворучний меч.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Дворучна сокира",
    description: "Масивна сокира, що тримається двома руками.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Моргенштерн",
    description: "Булава з шипами на кулі.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Ціп",
    description: "Ударна зброя на ланцюгу.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Трезубець",
    description: "Триконечна колюча зброя.",
    slot: "weapon",
    rarity: "common",
  },
  {
    name: "Серп",
    description: "Вигнутий клинок, спочатку сільськогосподарський інструмент.",
    slot: "weapon",
    rarity: "common",
  },
];

const RANGED_WEAPONS: ArtifactSeed[] = [
  {
    name: "Короткий лук",
    description: "Компактний лук для швидкої стрільби.",
    slot: "range_weapon",
    rarity: "common",
  },
  {
    name: "Довгий лук",
    description: "Потужний лук великої дальності.",
    slot: "range_weapon",
    rarity: "common",
  },
  {
    name: "Легкий арбалет",
    description: "Одноручний арбалет для швидкої стрільби.",
    slot: "range_weapon",
    rarity: "common",
  },
  {
    name: "Важкий арбалет",
    description: "Потужний дворучний арбалет.",
    slot: "range_weapon",
    rarity: "common",
  },
  {
    name: "Ручний арбалет",
    description: "Мініатюрний арбалет, що стріляє однією рукою.",
    slot: "range_weapon",
    rarity: "common",
  },
  {
    name: "Праща",
    description: "Проста метальна зброя з каменями.",
    slot: "range_weapon",
    rarity: "common",
  },
  {
    name: "Дротик",
    description: "Легкий метальний снаряд.",
    slot: "range_weapon",
    rarity: "common",
  },
  {
    name: "Метальна сокира",
    description: "Легка сокира для метання.",
    slot: "range_weapon",
    rarity: "common",
  },
  {
    name: "Метальний ніж",
    description: "Збалансований ніж для точного метання.",
    slot: "range_weapon",
    rarity: "common",
  },
  {
    name: "Духова трубка",
    description: "Тиха зброя, що стріляє отруєними голками.",
    slot: "range_weapon",
    rarity: "common",
  },
];

const HELMETS: ArtifactSeed[] = [
  {
    name: "Кований шолом",
    description: "Простий металевий шолом для захисту голови.",
    slot: "helmet",
    rarity: "common",
  },
  {
    name: "Кольчужний ковпак",
    description: "Легкий ковпак з кольчуги під шолом.",
    slot: "helmet",
    rarity: "common",
  },
  {
    name: "Відкритий шолом",
    description: "Шолом без забрала для кращого огляду.",
    slot: "helmet",
    rarity: "uncommon",
  },
  {
    name: "Басцинет",
    description: "Конічний шолом з забралом.",
    slot: "helmet",
    rarity: "uncommon",
  },
  {
    name: "Салад",
    description: "Заокруглений шолом з захистом потилиці.",
    slot: "helmet",
    rarity: "rare",
  },
];

const ARMOR_ITEMS: ArtifactSeed[] = [
  {
    name: "Шкіряна броня",
    description: "Легка броня з шкіри.",
    slot: "armor",
    rarity: "common",
  },
  {
    name: "Кольчуга",
    description: "Кільця металу, з'єднані в сітку.",
    slot: "armor",
    rarity: "common",
  },
  {
    name: "Кіраса",
    description: "Металевий нагрудник і спинка.",
    slot: "armor",
    rarity: "uncommon",
  },
  {
    name: "Латна броня",
    description: "Повний латний обладунок корпусу.",
    slot: "armor",
    rarity: "rare",
  },
  {
    name: "Броня з драконьої луски",
    description: "Міцна броня з луски дракона.",
    slot: "armor",
    rarity: "epic",
  },
];

const BOOTS_ITEMS: ArtifactSeed[] = [
  {
    name: "Шкіряні черевики",
    description: "М'які шкіряні черевики для походів.",
    slot: "boots",
    rarity: "common",
  },
  {
    name: "Черевики швидкості",
    description: "Легкі черевики, що додають швидкості.",
    slot: "boots",
    rarity: "uncommon",
  },
  {
    name: "Залізні чоботи",
    description: "Важкі металеві чоботи для захисту ніг.",
    slot: "boots",
    rarity: "common",
  },
  {
    name: "Черевики стелсу",
    description: "Тихі черевики для непомітного руху.",
    slot: "boots",
    rarity: "uncommon",
  },
  {
    name: "Чоботи мандрівника",
    description: "Зручні чоботи, що зменшують втому в дорозі.",
    slot: "boots",
    rarity: "rare",
  },
];

const ALL_ARTIFACTS: ArtifactSeed[] = [
  ...MELEE_WEAPONS,
  ...RANGED_WEAPONS,
  ...HELMETS,
  ...ARMOR_ITEMS,
  ...BOOTS_ITEMS,
];

async function main() {
  const campaignId = process.argv[2] || DEFAULT_CAMPAIGN_ID;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    console.error(`Кампанію з id "${campaignId}" не знайдено.`);
    console.error("Використання: pnpm run seed-artifacts [campaignId]");
    process.exit(1);
  }

  console.log(
    `Заповнення артефактів для кампанії "${campaign.name}" (${campaignId})...`,
  );

  let created = 0;

  let skipped = 0;

  for (const item of ALL_ARTIFACTS) {
    const existing = await prisma.artifact.findFirst({
      where: {
        campaignId,
        name: item.name,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.artifact.create({
      data: {
        campaignId,
        name: item.name,
        description: item.description,
        slot: item.slot,
        rarity: item.rarity,
        bonuses: {},
        modifiers: [],
        icon: ARTIFACT_ICONS[item.name] ?? null,
      },
    });

    created++;
  }

  console.log(
    `Готово! Створено: ${created}, пропущено (вже існують): ${skipped}`,
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
