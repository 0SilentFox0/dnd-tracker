#!/usr/bin/env tsx
/**
 * ВИДАЛЕННЯ МОК ДАНИХ ДЛЯ ТЕСТУВАННЯ БОЙОВОЇ СИСТЕМИ
 * 
 * Цей скрипт видаляє всі моки, створені seed-mock-battle-data.ts:
 * - Персонажі (Годрик Воїн, Айра Маг, Ліра Стрілець, Елвін Чарівник)
 * - Раси (human, elf)
 * - Дерева скілів для цих рас
 * - Скіли для Human та Elf
 * - Основні скіли (якщо створені моками)
 * - Заклинання (Fireball, Heal, Magic Missile, Cure Wounds, Poison Spray)
 * 
 * ВИКОРИСТАННЯ:
 *   npm run delete-mock-battle YOUR_CAMPAIGN_ID
 * 
 * УВАГА: Цей скрипт видаляє дані без підтвердження!
 */
import { PrismaClient } from "@prisma/client";

import { DEFAULT_CAMPAIGN_ID } from "./default-campaign";

const prisma = new PrismaClient();

// ID кампанії (потрібно передати як аргумент або змінити вручну)
const CAMPAIGN_ID = process.argv[2] || DEFAULT_CAMPAIGN_ID;

async function deleteMockData() {
  console.log("🗑️  Початок видалення мок даних...");

  if (!CAMPAIGN_ID || CAMPAIGN_ID === "YOUR_CAMPAIGN_ID") {
    console.error("❌ Помилка: Вкажіть ID кампанії як аргумент:");
    console.error("   npx tsx scripts/delete-mock-battle-data.ts YOUR_CAMPAIGN_ID");
    process.exit(1);
  }

  try {
    // Перевіряємо чи існує кампанія
    const campaign = await prisma.campaign.findUnique({
      where: { id: CAMPAIGN_ID },
    });

    if (!campaign) {
      console.error(`❌ Кампанія з ID ${CAMPAIGN_ID} не знайдена!`);
      process.exit(1);
    }

    console.log(`✅ Кампанія знайдена: ${campaign.name}`);

    // Список назв для видалення
    const mockSpellNames = [
      "Fireball",
      "Heal",
      "Magic Missile",
      "Cure Wounds",
      "Poison Spray",
    ];

    const mockCharacterNames = [
      "Годрик Воїн",
      "Айра Маг",
      "Ліра Стрілець",
      "Елвін Чарівник",
    ];

    const mockRaceNames = ["human", "elf"];

    const mockMainSkillNames = [
      "Бойова Майстерність",
      "Магія",
      "Захист",
      "Швидкість",
    ];

    // ============================================
    // 1. ВИДАЛЕННЯ ПЕРСОНАЖІВ
    // ============================================
    console.log("\n👥 Видалення персонажів...");

    let deletedCharacters = 0;

    for (const name of mockCharacterNames) {
      const deleted = await prisma.character.deleteMany({
        where: {
          campaignId: CAMPAIGN_ID,
          name: name,
        },
      });

      deletedCharacters += deleted.count;

      if (deleted.count > 0) {
        console.log(`  ✅ Видалено: ${name}`);
      }
    }
    console.log(`  📊 Всього видалено персонажів: ${deletedCharacters}`);

    // ============================================
    // 2. ВИДАЛЕННЯ ДЕРЕВ СКІЛІВ
    // ============================================
    console.log("\n🌳 Видалення дерев скілів...");

    let deletedSkillTrees = 0;

    for (const raceName of mockRaceNames) {
      const deleted = await prisma.skillTree.deleteMany({
        where: {
          campaignId: CAMPAIGN_ID,
          race: raceName,
        },
      });

      deletedSkillTrees += deleted.count;

      if (deleted.count > 0) {
        console.log(`  ✅ Видалено дерево для: ${raceName}`);
      }
    }
    console.log(`  📊 Всього видалено дерев: ${deletedSkillTrees}`);

    // ============================================
    // 3. ВИДАЛЕННЯ РАС
    // ============================================
    console.log("\n🏛️ Видалення рас...");

    let deletedRaces = 0;

    for (const raceName of mockRaceNames) {
      const deleted = await prisma.race.deleteMany({
        where: {
          campaignId: CAMPAIGN_ID,
          name: raceName,
        },
      });

      deletedRaces += deleted.count;

      if (deleted.count > 0) {
        console.log(`  ✅ Видалено: ${raceName}`);
      }
    }
    console.log(`  📊 Всього видалено рас: ${deletedRaces}`);

    // ============================================
    // 4. ВИДАЛЕННЯ СКІЛІВ
    // ============================================
    console.log("\n⚔️ Видалення скілів...");
    
    // Видаляємо скіли для Human та Elf (за назвами)
    const mockSkillNames = [
      // Human skills
      "Базова Атака",
      "Просунута Атака",
      "Базовий Захист",
      "Базове Заклинання",
      // Elf skills
      "Ельфійська Точність",
      "Отруйна Стріла",
      "Магічна Стрільба",
      "Покращене Заклинання",
    ];

    let deletedSkills = 0;

    for (const skillName of mockSkillNames) {
      const deleted = await prisma.skill.deleteMany({
        where: {
          campaignId: CAMPAIGN_ID,
          name: skillName,
        },
      });

      deletedSkills += deleted.count;

      if (deleted.count > 0) {
        console.log(`  ✅ Видалено: ${skillName}`);
      }
    }
    console.log(`  📊 Всього видалено скілів: ${deletedSkills}`);

    // ============================================
    // 5. ВИДАЛЕННЯ ОСНОВНИХ СКІЛІВ
    // ============================================
    console.log("\n📚 Видалення основних скілів...");

    let deletedMainSkills = 0;

    for (const mainSkillName of mockMainSkillNames) {
      const deleted = await prisma.mainSkill.deleteMany({
        where: {
          campaignId: CAMPAIGN_ID,
          name: mainSkillName,
        },
      });

      deletedMainSkills += deleted.count;

      if (deleted.count > 0) {
        console.log(`  ✅ Видалено: ${mainSkillName}`);
      }
    }
    console.log(`  📊 Всього видалено основних скілів: ${deletedMainSkills}`);

    // ============================================
    // 6. ВИДАЛЕННЯ ЗАКЛИНАНЬ
    // ============================================
    console.log("\n📜 Видалення заклинань...");

    let deletedSpells = 0;

    for (const spellName of mockSpellNames) {
      const deleted = await prisma.spell.deleteMany({
        where: {
          campaignId: CAMPAIGN_ID,
          name: spellName,
        },
      });

      deletedSpells += deleted.count;

      if (deleted.count > 0) {
        console.log(`  ✅ Видалено: ${spellName}`);
      }
    }
    console.log(`  📊 Всього видалено заклинань: ${deletedSpells}`);

    // ============================================
    // 7. ВИДАЛЕННЯ СЦЕН БОЮ
    // ============================================
    console.log("\n⚔️ Видалення сцен бою...");

    const mockBattleNames = [
      "Маленький бій (Мок)",
      "Великий бій (Мок)",
    ];

    let deletedBattles = 0;

    for (const battleName of mockBattleNames) {
      const deleted = await prisma.battleScene.deleteMany({
        where: {
          campaignId: CAMPAIGN_ID,
          name: battleName,
        },
      });

      deletedBattles += deleted.count;

      if (deleted.count > 0) {
        console.log(`  ✅ Видалено: ${battleName}`);
      }
    }
    console.log(`  📊 Всього видалено сцен бою: ${deletedBattles}`);

    console.log("\n✅ Всі моки успішно видалені!");
    console.log("\n📊 Підсумок:");
    console.log(`  - Персонажів: ${deletedCharacters}`);
    console.log(`  - Дерев скілів: ${deletedSkillTrees}`);
    console.log(`  - Рас: ${deletedRaces}`);
    console.log(`  - Скілів: ${deletedSkills}`);
    console.log(`  - Основних скілів: ${deletedMainSkills}`);
    console.log(`  - Заклинань: ${deletedSpells}`);
    console.log(`  - Сцен бою: ${deletedBattles}`);
  } catch (error) {
    console.error("❌ Помилка при видаленні моків:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteMockData()
  .then(() => {
    console.log("\n✨ Готово!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Критична помилка:", error);
    process.exit(1);
  });
