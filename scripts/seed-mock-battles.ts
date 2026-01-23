#!/usr/bin/env tsx
/**
 * МОК СЦЕНИ БОЮ ДЛЯ ТЕСТУВАННЯ
 * 
 * Цей скрипт створює 2 сцени бою з різними умовами:
 * 1. "Маленький бій" - 2 персонажі vs 1 юніт (статус: prepared)
 * 2. "Великий бій" - 4 персонажі vs 3 юніти (статус: active, раунд 2, хід 3)
 * 
 * ВИКОРИСТАННЯ:
 *   npm run seed-mock-battles YOUR_CAMPAIGN_ID
 * 
 * ВИДАЛИТИ ПІСЛЯ ТЕСТУВАННЯ!
 */
import { Prisma,PrismaClient } from "@prisma/client";

import { DEFAULT_CAMPAIGN_ID } from "../lib/constants/campaigns";

const prisma = new PrismaClient();

// ID кампанії (потрібно передати як аргумент або змінити вручну)
const CAMPAIGN_ID = process.argv[2] || DEFAULT_CAMPAIGN_ID;

async function seedMockBattles() {
  console.log("⚔️  Початок створення мок сцен бою...");

  if (!CAMPAIGN_ID || CAMPAIGN_ID === "YOUR_CAMPAIGN_ID") {
    console.error("❌ Помилка: Вкажіть ID кампанії як аргумент:");
    console.error("   npx tsx scripts/seed-mock-battles.ts YOUR_CAMPAIGN_ID");
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

    // Знаходимо мок персонажів
    const mockCharacterNames = [
      "Годрик Воїн",
      "Айра Маг",
      "Ліра Стрілець",
      "Елвін Чарівник",
    ];

    const characters = await prisma.character.findMany({
      where: {
        campaignId: CAMPAIGN_ID,
        name: { in: mockCharacterNames },
      },
    });

    if (characters.length === 0) {
      console.error("❌ Не знайдено мок персонажів! Спочатку запустіть:");
      console.error("   npm run seed-mock-battle YOUR_CAMPAIGN_ID");
      process.exit(1);
    }

    console.log(`✅ Знайдено ${characters.length} персонажів`);

    // Знаходимо мок юнітів (якщо є)
    const units = await prisma.unit.findMany({
      where: {
        campaignId: CAMPAIGN_ID,
      },
      take: 5, // Беремо перші 5 юнітів
    });

    console.log(`✅ Знайдено ${units.length} юнітів`);

    // Перевіряємо чи вже є мок битви
    const existingBattle = await prisma.battleScene.findFirst({
      where: {
        campaignId: CAMPAIGN_ID,
        name: "Маленький бій (Мок)",
      },
    });

    if (existingBattle) {
      console.log("\n⚠️  Мок битви вже існує! Пропускаємо створення.");
      console.log("   Якщо хочете перестворити - видаліть існуючі битви спочатку.");
      process.exit(0);
    }

    // ============================================
    // СЦЕНА 1: Маленький бій (Prepared)
    // ============================================
    console.log("\n⚔️ Створення сцени 1: Маленький бій...");

    if (characters.length < 2) {
      console.error("❌ Потрібно мінімум 2 персонажі для першої сцени!");
      process.exit(1);
    }

    const battle1Participants: Array<{
      id: string;
      type: "character" | "unit";
      side: "ally" | "enemy";
      quantity?: number;
    }> = [
      // Союзники: 2 персонажі
      {
        id: characters[0].id, // Годрик Воїн
        type: "character",
        side: "ally",
      },
      {
        id: characters[1].id, // Айра Маг
        type: "character",
        side: "ally",
      },
    ];

    // Додаємо ворога (юніт або персонаж)
    if (units.length > 0) {
      battle1Participants.push({
        id: units[0].id,
        type: "unit",
        side: "enemy",
        quantity: 1,
      });
    } else if (characters.length >= 3) {
      // Якщо немає юнітів, використовуємо персонажа як ворога
      battle1Participants.push({
        id: characters[2].id, // Ліра Стрілець
        type: "character",
        side: "enemy",
      });
    }

    const battle1 = await prisma.battleScene.create({
      data: {
        campaignId: CAMPAIGN_ID,
        name: "Маленький бій (Мок)",
        description: "Тестова сцена для перевірки базової механіки бою. 2 союзники проти 1 ворога.",
        status: "prepared",
        participants: battle1Participants as Prisma.InputJsonValue,
        currentRound: 1,
        currentTurnIndex: 0,
        initiativeOrder: [] as Prisma.InputJsonValue,
        battleLog: [] as Prisma.InputJsonValue,
      },
    });

    console.log(`  ✅ Створено: ${battle1.name} (ID: ${battle1.id})`);

    // ============================================
    // СЦЕНА 2: Великий бій (Active)
    // ============================================
    console.log("\n⚔️ Створення сцени 2: Великий бій...");

    if (characters.length < 4) {
      console.warn("⚠️  Недостатньо персонажів для другої сцени. Створюємо з доступними.");
    }

    const battle2Participants: Array<{
      id: string;
      type: "character" | "unit";
      side: "ally" | "enemy";
      quantity?: number;
    }> = [
      // Союзники: всі доступні персонажі (до 4)
      ...characters.slice(0, 4).map((char) => ({
        id: char.id,
        type: "character" as const,
        side: "ally" as const,
      })),
    ];

    // Вороги: юніти або персонажі
    if (units.length >= 3) {
      battle2Participants.push(
        ...units.slice(0, 3).map((unit) => ({
          id: unit.id,
          type: "unit" as const,
          side: "enemy" as const,
          quantity: 1,
        }))
      );
    } else if (characters.length >= 5) {
      // Якщо немає достатньо юнітів, використовуємо персонажів
      battle2Participants.push(
        ...characters.slice(4, 7).map((char) => ({
          id: char.id,
          type: "character" as const,
          side: "enemy" as const,
        }))
      );
    } else {
      // Мінімальний варіант: додаємо одного ворога
      if (units.length > 0) {
        battle2Participants.push({
          id: units[0].id,
          type: "unit",
          side: "enemy",
          quantity: 2, // 2 копії одного юніта
        });
      } else if (characters.length >= 3) {
        battle2Participants.push({
          id: characters[2].id,
          type: "character",
          side: "enemy",
        });
      }
    }

    // Створюємо простий initiativeOrder для активної битви
    // (в реальності це буде згенеровано через /start endpoint)
    // Для моку використовуємо спрощену структуру
    const mockInitiativeOrder = battle2Participants.map((participant, index) => {
      const isCharacter = participant.type === "character";

      const char = isCharacter ? characters.find((c) => c.id === participant.id) : null;
      
      return {
        id: `${participant.id}-${participant.type === "unit" ? (participant.quantity || 1) : 0}-${Date.now()}-${index}`,
        battleId: "will-be-updated",
        sourceId: participant.id,
        sourceType: participant.type,
        instanceNumber: participant.type === "unit" ? 1 : undefined,
        instanceId: participant.type === "unit" ? `${participant.id}-0` : undefined,
        name: isCharacter && char ? char.name : `Mock ${participant.type} ${index}`,
        avatar: isCharacter && char ? char.avatar || undefined : undefined,
        side: participant.side,
        controlledBy: isCharacter && char ? char.controlledBy : "dm",
        initiative: 20 - index * 2, // Різні ініціативи для тестування
        baseInitiative: 20 - index * 2,
        level: isCharacter && char ? char.level : 5,
        maxHp: isCharacter && char ? char.maxHp : 50,
        currentHp: isCharacter && char ? char.currentHp : (45 - index * 5), // Різне HP для тестування
        tempHp: 0,
        armorClass: isCharacter && char ? char.armorClass : (15 + index),
        morale: isCharacter && char ? (char as { morale?: number }).morale || 0 : 0,
        status: (isCharacter && char && char.currentHp <= 0 ? "dead" : "active") as "active" | "unconscious" | "dead",
        hasUsedAction: index === 3, // Третій учасник (currentTurnIndex) вже використав дію
        hasUsedBonusAction: false,
        hasUsedReaction: false,
        hasExtraTurn: false,
        strength: isCharacter && char ? char.strength : 16,
        dexterity: isCharacter && char ? char.dexterity : 14,
        constitution: isCharacter && char ? char.constitution : 16,
        intelligence: isCharacter && char ? char.intelligence : 12,
        wisdom: isCharacter && char ? char.wisdom : 12,
        charisma: isCharacter && char ? char.charisma : 10,
        modifiers: {
          strength: isCharacter && char ? Math.floor((char.strength - 10) / 2) : 3,
          dexterity: isCharacter && char ? Math.floor((char.dexterity - 10) / 2) : 2,
          constitution: isCharacter && char ? Math.floor((char.constitution - 10) / 2) : 3,
          intelligence: isCharacter && char ? Math.floor((char.intelligence - 10) / 2) : 1,
          wisdom: isCharacter && char ? Math.floor((char.wisdom - 10) / 2) : 1,
          charisma: isCharacter && char ? Math.floor((char.charisma - 10) / 2) : 0,
        },
        proficiencyBonus: isCharacter && char ? char.proficiencyBonus : 3,
        race: isCharacter && char ? char.race : "human",
        spellcastingClass: isCharacter && char ? char.spellcastingClass || undefined : undefined,
        spellcastingAbility: isCharacter && char ? (char.spellcastingAbility as "intelligence" | "wisdom" | "charisma" | undefined) : undefined,
        spellSaveDC: isCharacter && char ? char.spellSaveDC || undefined : undefined,
        spellAttackBonus: isCharacter && char ? char.spellAttackBonus || undefined : undefined,
        spellSlots: isCharacter && char ? (char.spellSlots as Record<string, { max: number; current: number }>) || {} : {},
        knownSpells: isCharacter && char ? (char.knownSpells as string[]) || [] : [],
        activeEffects: [],
        passiveAbilities: [],
        racialAbilities: [],
        activeSkills: [],
        equippedArtifacts: [],
        attacks: [],
      };
    });

    // Створюємо битву спочатку з порожнім initiativeOrder та battleLog
    const battle2 = await prisma.battleScene.create({
      data: {
        campaignId: CAMPAIGN_ID,
        name: "Великий бій (Мок)",
        description: "Тестова сцена для перевірки складних механік бою. 4 союзники проти 3 ворогів. Статус: active, раунд 2.",
        status: "active",
        participants: battle2Participants as Prisma.InputJsonValue,
        currentRound: 2,
        currentTurnIndex: 3, // Третій учасник в черзі
        initiativeOrder: [] as Prisma.InputJsonValue, // Спочатку порожній
        battleLog: [] as Prisma.InputJsonValue, // Спочатку порожній
        startedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 хвилин тому
      },
    });

    // Оновлюємо battleId в initiativeOrder
    const updatedMockInitiativeOrder = mockInitiativeOrder.map((participant) => ({
      ...participant,
      battleId: battle2.id,
    }));

    // Створюємо battleLog з правильними ID після створення битви
    const updatedBattleLog = [
      {
        id: "log-1",
        battleId: battle2.id,
        round: 1,
        actionIndex: 1,
        timestamp: new Date().toISOString(),
        actorId: updatedMockInitiativeOrder[0]?.id || "mock-participant-0",
        actorName: updatedMockInitiativeOrder[0]?.name || "Mock Character 0",
        actorSide: "ally",
        actionType: "attack",
        targets: [{ 
          participantId: updatedMockInitiativeOrder[4]?.id || "mock-participant-4", 
          participantName: updatedMockInitiativeOrder[4]?.name || "Mock Unit 4" 
        }],
        actionDetails: {
          weaponName: "Меч",
          attackRoll: 18,
          isHit: true,
          totalDamage: 12,
        },
        resultText: `${updatedMockInitiativeOrder[0]?.name || "Mock Character 0"} атакує ${updatedMockInitiativeOrder[4]?.name || "Mock Unit 4"} і завдає 12 урону`,
        hpChanges: [
          {
            participantId: updatedMockInitiativeOrder[4]?.id || "mock-participant-4",
            participantName: updatedMockInitiativeOrder[4]?.name || "Mock Unit 4",
            oldHp: 50,
            newHp: 38,
            change: -12,
          },
        ],
        isCancelled: false,
      },
      {
        id: "log-2",
        battleId: battle2.id,
        round: 1,
        actionIndex: 2,
        timestamp: new Date().toISOString(),
        actorId: updatedMockInitiativeOrder[1]?.id || "mock-participant-1",
        actorName: updatedMockInitiativeOrder[1]?.name || "Mock Character 1",
        actorSide: "ally",
        actionType: "spell",
        targets: [{ 
          participantId: updatedMockInitiativeOrder[0]?.id || "mock-participant-0", 
          participantName: updatedMockInitiativeOrder[0]?.name || "Mock Character 0" 
        }],
        actionDetails: {
          spellName: "Cure Wounds",
          spellLevel: 1,
          totalHealing: 8,
        },
        resultText: `${updatedMockInitiativeOrder[1]?.name || "Mock Character 1"} лікує ${updatedMockInitiativeOrder[0]?.name || "Mock Character 0"} на 8 HP`,
        hpChanges: [
          {
            participantId: updatedMockInitiativeOrder[0]?.id || "mock-participant-0",
            participantName: updatedMockInitiativeOrder[0]?.name || "Mock Character 0",
            oldHp: 45,
            newHp: 50,
            change: 5, // Було 45, макс 50, тому +5
          },
        ],
        isCancelled: false,
      },
    ];

    // Оновлюємо битву з правильним initiativeOrder та battleLog
    await prisma.battleScene.update({
      where: { id: battle2.id },
      data: {
        initiativeOrder: updatedMockInitiativeOrder as Prisma.InputJsonValue,
        battleLog: updatedBattleLog as Prisma.InputJsonValue,
      },
    });

    console.log(`  ✅ Створено: ${battle2.name} (ID: ${battle2.id})`);
    console.log(`     Статус: ${battle2.status}, Раунд: ${battle2.currentRound}, Хід: ${battle2.currentTurnIndex}`);

    console.log("\n✅ Всі мок сцени бою успішно створені!");
    console.log("\n📊 Підсумок:");
    console.log(`  - Сцена 1: "${battle1.name}" (${battle1.status})`);
    console.log(`    Учасників: ${battle1Participants.length}`);
    console.log(`    Союзники: ${battle1Participants.filter((p) => p.side === "ally").length}`);
    console.log(`    Вороги: ${battle1Participants.filter((p) => p.side === "enemy").length}`);
    console.log(`  - Сцена 2: "${battle2.name}" (${battle2.status})`);
    console.log(`    Учасників: ${battle2Participants.length}`);
    console.log(`    Союзники: ${battle2Participants.filter((p) => p.side === "ally").length}`);
    console.log(`    Вороги: ${battle2Participants.filter((p) => p.side === "enemy").length}`);
    console.log(`    Раунд: ${battle2.currentRound}, Хід: ${battle2.currentTurnIndex}`);
    console.log(`    Записів в логі: 2`);
  } catch (error) {
    console.error("❌ Помилка при створенні мок сцен бою:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedMockBattles()
  .then(() => {
    console.log("\n✨ Готово!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Критична помилка:", error);
    process.exit(1);
  });
