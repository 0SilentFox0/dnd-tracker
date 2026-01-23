#!/usr/bin/env tsx
/**
 * МОК ДАНІ ДЛЯ ТЕСТУВАННЯ БОЙОВОЇ СИСТЕМИ
 * 
 * Цей файл містить всі моки для тестування:
 * - Заклинання (Spells) - 5 шт
 * - Основні скіли (MainSkills) - 4 шт
 * - Скіли для Human - 4 шт
 * - Скіли для Elf - 4 шт
 * - Раси (Race) - 2 шт (human, elf)
 * - Дерева скілів (SkillTree) - 2 шт
 * - Персонажі (Character) - 4 шт (по 2 на расу)
 * 
 * ВИКОРИСТАННЯ:
 *   npm run seed-mock-battle YOUR_CAMPAIGN_ID
 * 
 * ВИДАЛИТИ ПІСЛЯ ТЕСТУВАННЯ!
 */
import { Prisma,PrismaClient } from "@prisma/client";

import { DEFAULT_CAMPAIGN_ID } from "../lib/constants/campaigns";

const prisma = new PrismaClient();

// ID кампанії (потрібно передати як аргумент або змінити вручну)
const CAMPAIGN_ID = process.argv[2] || DEFAULT_CAMPAIGN_ID;

async function seedMockData() {
  console.log("🌱 Початок заповнення мок даними...");

  if (!CAMPAIGN_ID || CAMPAIGN_ID === "YOUR_CAMPAIGN_ID") {
    console.error("❌ Помилка: Вкажіть ID кампанії як аргумент:");
    console.error("   npx tsx scripts/seed-mock-battle-data.ts YOUR_CAMPAIGN_ID");
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

    // Перевіряємо чи вже є моки (за назвами)
    const existingSpell = await prisma.spell.findFirst({
      where: {
        campaignId: CAMPAIGN_ID,
        name: "Fireball",
      },
    });

    if (existingSpell) {
      console.log("\n⚠️  Моки вже існують! Пропускаємо створення.");
      console.log("   Якщо хочете перестворити - видаліть існуючі дані спочатку.");
      process.exit(0);
    }

    // ============================================
    // 1. СТВОРЕННЯ ЗАКЛИНАНЬ (SPELLS)
    // ============================================
    console.log("\n📜 Створення заклинань...");

    const spells = [
      {
        name: "Fireball",
        level: 3,
        type: "aoe",
        target: "enemies",
        damageType: "damage",
        damageElement: "fire",
        diceCount: 8,
        diceType: "d6",
        savingThrow: {
          ability: "dexterity",
          onSuccess: "half",
        },
        description: "Вибух вогню, що вражає всіх ворогів в радіусі",
        concentration: false,
      },
      {
        name: "Heal",
        level: 3,
        type: "target",
        target: "allies",
        damageType: "heal",
        diceCount: 4,
        diceType: "d8",
        description: "Лікує союзника",
        concentration: false,
      },
      {
        name: "Magic Missile",
        level: 1,
        type: "target",
        target: "enemies",
        damageType: "damage",
        damageElement: "force",
        diceCount: 3,
        diceType: "d4",
        description: "Три магічні стріли, що завжди попадають",
        concentration: false,
      },
      {
        name: "Cure Wounds",
        level: 1,
        type: "target",
        target: "allies",
        damageType: "heal",
        diceCount: 1,
        diceType: "d8",
        description: "Базове лікування",
        concentration: false,
      },
      {
        name: "Poison Spray",
        level: 0,
        type: "target",
        target: "enemies",
        damageType: "damage",
        damageElement: "poison",
        damageModifier: "poison",
        diceCount: 1,
        diceType: "d12",
        savingThrow: {
          ability: "constitution",
          onSuccess: "none",
        },
        description: "Отруйний спрей з DOT ефектом",
        concentration: false,
      },
    ];

    const createdSpells = [];

    for (const spellData of spells) {
      // Перевіряємо чи вже існує заклинання з такою назвою
      const existing = await prisma.spell.findFirst({
        where: {
          campaignId: CAMPAIGN_ID,
          name: spellData.name,
        },
      });

      if (existing) {
        console.log(`  ⏭️  Пропущено (вже існує): ${spellData.name}`);
        createdSpells.push(existing);
        continue;
      }

      const spell = await prisma.spell.create({
        data: {
          campaignId: CAMPAIGN_ID,
          ...spellData,
          savingThrow: spellData.savingThrow
            ? (spellData.savingThrow as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });

      createdSpells.push(spell);
      console.log(`  ✅ Створено: ${spell.name}`);
    }

    // ============================================
    // 2. СТВОРЕННЯ MAIN SKILLS
    // ============================================
    console.log("\n🎯 Створення основних скілів...");

    const mainSkills = [
      { name: "Бойова Майстерність", color: "#ef4444", icon: "⚔️" },
      { name: "Магія", color: "#8b5cf6", icon: "✨" },
      { name: "Захист", color: "#3b82f6", icon: "🛡️" },
      { name: "Швидкість", color: "#10b981", icon: "💨" },
    ];

    const createdMainSkills = [];

    for (const mainSkillData of mainSkills) {
      // Перевіряємо чи вже існує
      const existing = await prisma.mainSkill.findFirst({
        where: {
          campaignId: CAMPAIGN_ID,
          name: mainSkillData.name,
        },
      });

      if (existing) {
        console.log(`  ⏭️  Пропущено (вже існує): ${mainSkillData.name}`);
        createdMainSkills.push(existing);
        continue;
      }

      const mainSkill = await prisma.mainSkill.create({
        data: {
          campaignId: CAMPAIGN_ID,
          ...mainSkillData,
        },
      });

      createdMainSkills.push(mainSkill);
      console.log(`  ✅ Створено: ${mainSkill.name}`);
    }

    // ============================================
    // 3. СТВОРЕННЯ SKILLS ДЛЯ HUMAN
    // ============================================
    console.log("\n👤 Створення скілів для раси Human...");

    const humanSkills: Array<{
      name: string;
      description: string;
      bonuses: Record<string, number>;
      mainSkillId: string;
      races: string[];
      isRacial: boolean;
      spellEffectIncrease?: number;
    }> = [
      {
        name: "Базова Атака",
        description: "+15% до урону ближньою зброєю",
        bonuses: {
          melee_damage_percent: 15,
        },
        mainSkillId: createdMainSkills[0].id,
        races: ["human"],
        isRacial: false,
      },
      {
        name: "Просунута Атака",
        description: "+10% до урону ближньою зброєю",
        bonuses: {
          melee_damage_percent: 10,
        },
        mainSkillId: createdMainSkills[0].id,
        races: ["human"],
        isRacial: false,
      },
      {
        name: "Базовий Захист",
        description: "+2 до AC",
        bonuses: {
          ac_bonus: 2,
        },
        mainSkillId: createdMainSkills[2].id,
        races: ["human"],
        isRacial: false,
      },
      {
        name: "Базове Заклинання",
        description: "+10% до ефекту заклинань",
        bonuses: {},
        spellEffectIncrease: 10,
        mainSkillId: createdMainSkills[1].id,
        races: ["human"],
        isRacial: false,
      },
    ];

    const createdHumanSkills = [];

    for (const skillData of humanSkills) {
      // Перевіряємо чи вже існує
      const existing = await prisma.skill.findFirst({
        where: {
          campaignId: CAMPAIGN_ID,
          name: skillData.name,
        },
      });

      if (existing) {
        console.log(`  ⏭️  Пропущено (вже існує): ${skillData.name}`);
        createdHumanSkills.push(existing);
        continue;
      }

      const skill = await prisma.skill.create({
        data: {
          campaignId: CAMPAIGN_ID,
          name: skillData.name,
          description: skillData.description,
          bonuses: skillData.bonuses as Prisma.InputJsonValue,
          races: skillData.races as string[],
          isRacial: skillData.isRacial,
          mainSkillId: skillData.mainSkillId,
          spellEffectIncrease: skillData.spellEffectIncrease || null,
        },
      });

      createdHumanSkills.push(skill);
      console.log(`  ✅ Створено: ${skill.name}`);
    }

    // ============================================
    // 4. СТВОРЕННЯ SKILLS ДЛЯ ELF
    // ============================================
    console.log("\n🧝 Створення скілів для раси Elf...");

    const elfSkills = [
      {
        name: "Ельфійська Точність",
        description: "Advantage на дальні атаки",
        bonuses: {
          ranged_attack_advantage: true,
        },
        mainSkillId: createdMainSkills[0].id,
        races: ["elf"],
        isRacial: true,
      },
      {
        name: "Магічна Стрільба",
        description: "+20% до урону дальньою зброєю",
        bonuses: {
          ranged_damage_percent: 20,
        },
        mainSkillId: createdMainSkills[0].id,
        races: ["elf"],
        isRacial: false,
      },
      {
        name: "Покращене Заклинання",
        description: "+25% до ефекту заклинань",
        spellEffectIncrease: 25,
        mainSkillId: createdMainSkills[1].id,
        races: ["elf"],
        isRacial: false,
      },
      {
        name: "Отруйна Стріла",
        description: "Додає отруту до заклинання",
        spellId: createdSpells[4].id, // Poison Spray
        spellAdditionalModifier: {
          modifier: "poison",
          damageDice: "1d6",
          duration: 3,
        },
        mainSkillId: createdMainSkills[1].id,
        races: ["elf"],
        isRacial: false,
      },
    ];

    const createdElfSkills = [];

    for (const skillData of elfSkills) {
      // Перевіряємо чи вже існує
      const existing = await prisma.skill.findFirst({
        where: {
          campaignId: CAMPAIGN_ID,
          name: skillData.name,
        },
      });

      if (existing) {
        console.log(`  ⏭️  Пропущено (вже існує): ${skillData.name}`);
        createdElfSkills.push(existing);
        continue;
      }

      const skill = await prisma.skill.create({
        data: {
          campaignId: CAMPAIGN_ID,
          name: skillData.name,
          description: skillData.description,
          bonuses: skillData.bonuses as Prisma.InputJsonValue,
          races: skillData.races as string[],
          isRacial: skillData.isRacial,
          mainSkillId: skillData.mainSkillId,
          spellId: skillData.spellId || null,
          spellAdditionalModifier: skillData.spellAdditionalModifier
            ? (skillData.spellAdditionalModifier as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          spellEffectIncrease: skillData.spellEffectIncrease || null,
        },
      });

      createdElfSkills.push(skill);
      console.log(`  ✅ Створено: ${skill.name}`);
    }

    // ============================================
    // 5. СТВОРЕННЯ RACES
    // ============================================
    console.log("\n🏛️ Створення рас...");

    let humanRace = await prisma.race.findFirst({
      where: {
        campaignId: CAMPAIGN_ID,
        name: "human",
      },
    });

    if (!humanRace) {
      humanRace = await prisma.race.create({
        data: {
          campaignId: CAMPAIGN_ID,
          name: "human",
          availableSkills: createdHumanSkills.map((s) => s.id) as Prisma.InputJsonValue,
          disabledSkills: [] as Prisma.InputJsonValue,
          passiveAbility: {
            type: "morale_modifier",
            description: "Мораль не може бути нижче 0",
          } as Prisma.InputJsonValue,
        },
      });
      console.log(`  ✅ Створено: ${humanRace.name}`);
    } else {
      console.log(`  ⏭️  Пропущено (вже існує): ${humanRace.name}`);
    }

    let elfRace = await prisma.race.findFirst({
      where: {
        campaignId: CAMPAIGN_ID,
        name: "elf",
      },
    });

    if (!elfRace) {
      elfRace = await prisma.race.create({
        data: {
          campaignId: CAMPAIGN_ID,
          name: "elf",
          availableSkills: createdElfSkills.map((s) => s.id) as Prisma.InputJsonValue,
          disabledSkills: [] as Prisma.InputJsonValue,
          passiveAbility: {
            type: "advantage_ranged",
            description: "Advantage на дальні атаки",
          } as Prisma.InputJsonValue,
        },
      });
      console.log(`  ✅ Створено: ${elfRace.name}`);
    } else {
      console.log(`  ⏭️  Пропущено (вже існує): ${elfRace.name}`);
    }

    console.log(`  ✅ Створено: ${humanRace.name}`);
    console.log(`  ✅ Створено: ${elfRace.name}`);

    // ============================================
    // 6. СТВОРЕННЯ SKILL TREES
    // ============================================
    console.log("\n🌳 Створення дерев скілів...");

    // SkillTree для Human
    let humanSkillTree = await prisma.skillTree.findFirst({
      where: {
        campaignId: CAMPAIGN_ID,
        race: "human",
      },
    });

    if (!humanSkillTree) {
      humanSkillTree = await prisma.skillTree.create({
        data: {
          campaignId: CAMPAIGN_ID,
          race: "human",
          skills: [
            {
              mainSkillId: createdMainSkills[0].id,
              skills: [
                { skillId: createdHumanSkills[0].id, level: "basic" },
                { skillId: createdHumanSkills[1].id, level: "advanced" },
              ],
            },
            {
              mainSkillId: createdMainSkills[1].id,
              skills: [{ skillId: createdHumanSkills[3].id, level: "basic" }],
            },
            {
              mainSkillId: createdMainSkills[2].id,
              skills: [{ skillId: createdHumanSkills[2].id, level: "basic" }],
            },
          ] as Prisma.InputJsonValue,
        },
      });
      console.log(`  ✅ Створено дерево для: human`);
    } else {
      console.log(`  ⏭️  Пропущено (вже існує): дерево для human`);
    }

    // SkillTree для Elf
    let elfSkillTree = await prisma.skillTree.findFirst({
      where: {
        campaignId: CAMPAIGN_ID,
        race: "elf",
      },
    });

    if (!elfSkillTree) {
      elfSkillTree = await prisma.skillTree.create({
        data: {
          campaignId: CAMPAIGN_ID,
          race: "elf",
          skills: [
            {
              mainSkillId: createdMainSkills[0].id,
              skills: [
                { skillId: createdElfSkills[0].id, level: "basic" },
                { skillId: createdElfSkills[1].id, level: "advanced" },
              ],
            },
            {
              mainSkillId: createdMainSkills[1].id,
              skills: [
                { skillId: createdElfSkills[2].id, level: "basic" },
                { skillId: createdElfSkills[3].id, level: "advanced" },
              ],
            },
          ] as Prisma.InputJsonValue,
        },
      });
      console.log(`  ✅ Створено дерево для: elf`);
    } else {
      console.log(`  ⏭️  Пропущено (вже існує): дерево для elf`);
    }

    console.log(`  ✅ Створено дерево для: human`);
    console.log(`  ✅ Створено дерево для: elf`);

    // ============================================
    // 7. СТВОРЕННЯ ПЕРСОНАЖІВ
    // ============================================
    console.log("\n👥 Створення персонажів...");

    // Отримуємо першого користувача кампанії як DM
    const campaignMember = await prisma.campaignMember.findFirst({
      where: { campaignId: CAMPAIGN_ID, role: "dm" },
    });

    if (!campaignMember) {
      console.error("❌ Не знайдено DM в кампанії!");
      process.exit(1);
    }

    const dmUserId = campaignMember.userId;

    // Human персонажі
    const humanCharacters = [
      {
        name: "Годрик Воїн",
        type: "player",
        controlledBy: dmUserId,
        level: 5,
        class: "Fighter",
        race: "human",
        strength: 18,
        dexterity: 14,
        constitution: 16,
        intelligence: 10,
        wisdom: 12,
        charisma: 10,
        armorClass: 18,
        initiative: 2,
        speed: 30,
        maxHp: 45,
        currentHp: 45,
        tempHp: 0,
        hitDice: "1d10",
        proficiencyBonus: 3,
        morale: 1,
        spellSlots: {},
        knownSpells: [],
        skillTreeProgress: {} as Prisma.InputJsonValue, // Буде заповнено після створення дерева
      },
      {
        name: "Айра Маг",
        type: "player",
        controlledBy: dmUserId,
        level: 5,
        class: "Wizard",
        race: "human",
        strength: 8,
        dexterity: 14,
        constitution: 12,
        intelligence: 18,
        wisdom: 14,
        charisma: 10,
        armorClass: 12,
        initiative: 2,
        speed: 30,
        maxHp: 32,
        currentHp: 32,
        tempHp: 0,
        hitDice: "1d6",
        proficiencyBonus: 3,
        morale: 0,
        spellcastingClass: "wizard",
        spellcastingAbility: "intelligence",
        spellSaveDC: 15,
        spellAttackBonus: 7,
        spellSlots: {
          "1": { max: 4, current: 4 },
          "2": { max: 3, current: 3 },
          "3": { max: 2, current: 2 },
        },
        knownSpells: [
          createdSpells[0].id, // Fireball
          createdSpells[2].id, // Magic Missile
          createdSpells[3].id, // Cure Wounds
        ],
        skillTreeProgress: {} as Prisma.InputJsonValue, // Буде заповнено після створення дерева
      },
    ];

    // Elf персонажі
    const elfCharacters = [
      {
        name: "Ліра Стрілець",
        type: "player",
        controlledBy: dmUserId,
        level: 5,
        class: "Ranger",
        race: "elf",
        strength: 12,
        dexterity: 18,
        constitution: 14,
        intelligence: 12,
        wisdom: 16,
        charisma: 10,
        armorClass: 16,
        initiative: 4,
        speed: 30,
        maxHp: 38,
        currentHp: 38,
        tempHp: 0,
        hitDice: "1d10",
        proficiencyBonus: 3,
        morale: 1,
        spellSlots: {
          "1": { max: 3, current: 3 },
          "2": { max: 2, current: 2 },
        },
        knownSpells: [createdSpells[1].id, createdSpells[3].id], // Heal, Cure Wounds
        skillTreeProgress: {} as Prisma.InputJsonValue, // Буде заповнено після створення дерева
      },
      {
        name: "Елвін Чарівник",
        type: "player",
        controlledBy: dmUserId,
        level: 5,
        class: "Sorcerer",
        race: "elf",
        strength: 8,
        dexterity: 16,
        constitution: 14,
        intelligence: 12,
        wisdom: 10,
        charisma: 18,
        armorClass: 13,
        initiative: 3,
        speed: 30,
        maxHp: 35,
        currentHp: 35,
        tempHp: 0,
        hitDice: "1d6",
        proficiencyBonus: 3,
        morale: 0,
        spellcastingClass: "sorcerer",
        spellcastingAbility: "charisma",
        spellSaveDC: 16,
        spellAttackBonus: 8,
        spellSlots: {
          "1": { max: 4, current: 4 },
          "2": { max: 3, current: 3 },
          "3": { max: 2, current: 2 },
        },
        knownSpells: [
          createdSpells[0].id, // Fireball
          createdSpells[2].id, // Magic Missile
          createdSpells[4].id, // Poison Spray
        ],
        skillTreeProgress: {} as Prisma.InputJsonValue, // Буде заповнено після створення дерева
      },
    ];

    const allCharacters = [...humanCharacters, ...elfCharacters];

    const createdCharacters = [];

    for (const charData of allCharacters) {
      // Перевіряємо чи вже існує персонаж з таким ім'ям
      const existing = await prisma.character.findFirst({
        where: {
          campaignId: CAMPAIGN_ID,
          name: charData.name,
        },
      });

      if (existing) {
        console.log(`  ⏭️  Пропущено (вже існує): ${charData.name} (${charData.race})`);
        createdCharacters.push(existing);
        continue;
      }

      const character = await prisma.character.create({
        data: {
          campaignId: CAMPAIGN_ID,
          ...charData,
          spellSlots: charData.spellSlots as Prisma.InputJsonValue,
          knownSpells: charData.knownSpells as Prisma.InputJsonValue,
          skillTreeProgress: charData.skillTreeProgress as Prisma.InputJsonValue,
        },
      });

      // Створюємо CharacterSkills для дерева скілів
      const skillTreeId =
        charData.race === "human" ? humanSkillTree.id : elfSkillTree.id;
      
      // Визначаємо розблоковані скіли залежно від персонажа
      let unlockedSkills: string[] = [];

      if (character.race === "human") {
        if (character.name === "Годрик Воїн") {
          unlockedSkills = [createdHumanSkills[0].id, createdHumanSkills[2].id];
        } else if (character.name === "Айра Маг") {
          unlockedSkills = [createdHumanSkills[3].id];
        }
      } else if (character.race === "elf") {
        if (character.name === "Ліра Стрілець") {
          unlockedSkills = [createdElfSkills[0].id, createdElfSkills[1].id];
        } else if (character.name === "Елвін Чарівник") {
          unlockedSkills = [createdElfSkills[2].id, createdElfSkills[3].id];
        }
      }
      
      // Оновлюємо skillTreeProgress
      await prisma.character.update({
        where: { id: character.id },
        data: {
          skillTreeProgress: {
            [skillTreeId]: {
              unlockedSkills,
            },
          } as Prisma.InputJsonValue,
        },
      });

      await prisma.characterSkills.create({
        data: {
          characterId: character.id,
          skillTreeId: skillTreeId,
          unlockedSkills: unlockedSkills as Prisma.InputJsonValue,
        },
      });

      // Створюємо інвентар з базовою зброєю
      let equippedItems: Record<string, unknown> = {};

      if (character.class === "Fighter") {
        equippedItems = {
          mainHand: {
            id: `weapon-${character.id}-sword`,
            name: "Меч",
            type: "weapon",
            attackBonus: 7,
            damageDice: "1d8+4",
            damageType: "slashing",
            weaponType: "melee",
          },
        };
      } else if (character.class === "Ranger") {
        equippedItems = {
          mainHand: {
            id: `weapon-${character.id}-bow`,
            name: "Лук",
            type: "weapon",
            attackBonus: 8,
            damageDice: "1d8+4",
            damageType: "piercing",
            weaponType: "ranged",
            range: "150/600",
          },
        };
      } else {
        // Для магів
        equippedItems = {
          mainHand: {
            id: `weapon-${character.id}-staff`,
            name: "Посох",
            type: "weapon",
            attackBonus: 2,
            damageDice: "1d6",
            damageType: "bludgeoning",
            weaponType: "melee",
          },
        };
      }

      await prisma.characterInventory.create({
        data: {
          characterId: character.id,
          equipped: equippedItems as Prisma.InputJsonValue,
          backpack: [],
          gold: 100,
          silver: 0,
          copper: 0,
          items: [],
        },
      });

      createdCharacters.push(character);
      console.log(`  ✅ Створено: ${character.name} (${character.race})`);
    }

    console.log("\n✅ Всі моки успішно створені!");
    console.log("\n📊 Підсумок:");
    console.log(`  - Заклинань: ${createdSpells.length}`);
    console.log(`  - Основних скілів: ${createdMainSkills.length}`);
    console.log(`  - Скілів для Human: ${createdHumanSkills.length}`);
    console.log(`  - Скілів для Elf: ${createdElfSkills.length}`);
    console.log(`  - Рас: 2`);
    console.log(`  - Дерев скілів: 2`);
    console.log(`  - Персонажів: ${createdCharacters.length}`);
    console.log("\n🎮 Готово до тестування!");
  } catch (error) {
    console.error("❌ Помилка при створенні моків:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedMockData();
