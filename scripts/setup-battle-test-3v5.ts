#!/usr/bin/env tsx
/**
 * Підготовка сценарію для генеральної перевірки бою: 3 герої (різні раси, 20 рівень) vs 5 юнітів.
 *
 * Передумови:
 * - Кампанія існує, є DM.
 * - Рекомендовано спочатку запустити seed: npx tsx scripts/seed-mock-battle-data.ts CAMPAIGN_ID
 *   (створить расы human/elf, скіли, заклинання, дерева скілів).
 *
 * Скрипт:
 * - Додає расу Dwarf і дерево скілів для неї (якщо немає).
 * - Створює 3 персонажів 20 рівня: Human (Fighter), Elf (Ranger), Dwarf (Cleric) з прокачаним деревом по расі.
 * - Створює 5 ворожих юнітів у бібліотеці.
 * - Створює одну сцену бою (3 союзники vs 5 ворогів), status = prepared.
 *
 * Використання:
 *   npx tsx scripts/setup-battle-test-3v5.ts YOUR_CAMPAIGN_ID
 */
import { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

import { AttackType } from "../lib/constants/battle";
import {
  getAbilityModifier,
  getProficiencyBonus,
  getSpellAttackBonus,
  getSpellSaveDC,
} from "../lib/utils/common/calculations";

const prisma = new PrismaClient();

const CAMPAIGN_ID = process.argv[2];

async function main() {
  if (!CAMPAIGN_ID) {
    console.error("Вкажіть ID кампанії: npx tsx scripts/setup-battle-test-3v5.ts YOUR_CAMPAIGN_ID");
    process.exit(1);
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: CAMPAIGN_ID } });

  if (!campaign) {
    console.error(`Кампанія ${CAMPAIGN_ID} не знайдена.`);
    process.exit(1);
  }

  const dm = await prisma.campaignMember.findFirst({
    where: { campaignId: CAMPAIGN_ID, role: "dm" },
  });

  if (!dm) {
    console.error("У кампанії немає DM.");
    process.exit(1);
  }

  const pb20 = getProficiencyBonus(20); // 6

  // --- Раси та дерева скілів ---
  const humanRace = await prisma.race.findFirst({
    where: { campaignId: CAMPAIGN_ID, name: "human" },
  });

  const elfRace = await prisma.race.findFirst({
    where: { campaignId: CAMPAIGN_ID, name: "elf" },
  });

  let dwarfRace = await prisma.race.findFirst({
    where: { campaignId: CAMPAIGN_ID, name: "dwarf" },
  });

  const mainSkills = await prisma.mainSkill.findMany({
    where: { campaignId: CAMPAIGN_ID },
    take: 4,
  });

  const humanSkills = await prisma.skill.findMany({
    where: { campaignId: CAMPAIGN_ID },
  });

  const humanSkillTree = await prisma.skillTree.findFirst({
    where: { campaignId: CAMPAIGN_ID, race: "human" },
  });

  const elfSkillTree = await prisma.skillTree.findFirst({
    where: { campaignId: CAMPAIGN_ID, race: "elf" },
  });

  if (!humanRace || !elfRace || !humanSkillTree || !elfSkillTree || mainSkills.length === 0) {
    console.error(
      "Запустіть спочатку seed: npx tsx scripts/seed-mock-battle-data.ts",
      CAMPAIGN_ID
    );
    process.exit(1);
  }

  // Dwarf: раса + один скіл + дерево
  if (!dwarfRace) {
    const dwarfMainSkill = mainSkills[0];

    const dwarfSkill = await prisma.skill.create({
      data: {
        campaignId: CAMPAIGN_ID,
        name: "Дворфійська Стійкість",
        description: "+1 до AC",
        bonuses: { ac_bonus: 1 } as Prisma.InputJsonValue,
        mainSkillId: dwarfMainSkill.id,
      },
    });

    dwarfRace = await prisma.race.create({
      data: {
        campaignId: CAMPAIGN_ID,
        name: "dwarf",
        availableSkills: [dwarfSkill.id] as Prisma.InputJsonValue,
        disabledSkills: [] as Prisma.InputJsonValue,
      },
    });

    const dwarfTree = await prisma.skillTree.create({
      data: {
        campaignId: CAMPAIGN_ID,
        race: "dwarf",
        skills: [
          {
            mainSkillId: dwarfMainSkill.id,
            skills: [{ skillId: dwarfSkill.id, level: "basic" }],
          },
        ] as Prisma.InputJsonValue,
      },
    });

    console.log("Створено расу dwarf та дерево скілів.");
  }

  const dwarfSkillTree = await prisma.skillTree.findFirst({
    where: { campaignId: CAMPAIGN_ID, race: "dwarf" },
  });

  if (!dwarfSkillTree) {
    console.error("Дерево для dwarf не знайдено.");
    process.exit(1);
  }

  // ID скілів для розблокування (перші з кампанії по расам)
  const humanSkillIds = humanSkills.filter((s) => s.mainSkillId === mainSkills[0].id).map((s) => s.id);

  const elfSkills = await prisma.skill.findMany({
    where: { campaignId: CAMPAIGN_ID },
  });

  const elfSkillIds = elfSkills.slice(0, 2).map((s) => s.id);

  const dwarfSkillIds = await prisma.skill
    .findMany({
      where: { campaignId: CAMPAIGN_ID },
    })
    .then((skills) => skills.filter((s) => s.name.includes("Дворф") || s.name.includes("dwarf")).map((s) => s.id));

  const dwarfUnlockIds =
    dwarfSkillIds.length > 0 ? dwarfSkillIds : (await prisma.skill.findMany({ where: { campaignId: CAMPAIGN_ID }, take: 1 })).map((s) => s.id);

  // Заклинання для клеріка
  const spells = await prisma.spell.findMany({
    where: { campaignId: CAMPAIGN_ID },
    take: 5,
  });

  const healSpell = spells.find((s) => s.damageType === "heal") || spells[0];

  const knownSpellIds = spells.slice(0, 3).map((s) => s.id);

  if (healSpell && !knownSpellIds.includes(healSpell.id)) knownSpellIds.push(healSpell.id);

  const wisMod = getAbilityModifier(18);

  const spellSaveDC = getSpellSaveDC(pb20, wisMod);

  const spellAttackBonus = getSpellAttackBonus(pb20, wisMod);

  // --- Створення 3 персонажів 20 рівня ---
  const characterPayloads: Array<{
    name: string;
    race: string;
    class: string;
    skillTreeId: string;
    unlockedSkills: string[];
    spellcasting?: boolean;
  }> = [
    {
      name: "Тест-Герой-1",
      race: "human",
      class: "Fighter",
      skillTreeId: humanSkillTree.id,
      unlockedSkills: humanSkillIds.slice(0, 2),
    },
    {
      name: "Тест-Герой-2",
      race: "elf",
      class: "Ranger",
      skillTreeId: elfSkillTree.id,
      unlockedSkills: elfSkillIds.slice(0, 2),
    },
    {
      name: "Тест-Герой-3",
      race: "dwarf",
      class: "Cleric",
      skillTreeId: dwarfSkillTree.id,
      unlockedSkills: dwarfUnlockIds,
      spellcasting: true,
    },
  ];

  const characterIds: string[] = [];

  for (const payload of characterPayloads) {
    let char = await prisma.character.findFirst({
      where: { campaignId: CAMPAIGN_ID, name: payload.name },
    });

    const baseStats = {
      campaignId: CAMPAIGN_ID,
      type: "player" as const,
      controlledBy: dm.userId,
      name: payload.name,
      level: 20,
      class: payload.class,
      race: payload.race,
      strength: 16,
      dexterity: 14,
      constitution: 16,
      intelligence: 10,
      wisdom: payload.spellcasting ? 18 : 12,
      charisma: 10,
      armorClass: 18,
      initiative: 2,
      speed: 30,
      maxHp: payload.class === "Fighter" ? 180 : 140,
      currentHp: payload.class === "Fighter" ? 180 : 140,
      tempHp: 0,
      hitDice: payload.class === "Fighter" ? "1d10" : "1d8",
      proficiencyBonus: pb20,
      morale: 0,
      spellcastingClass: payload.spellcasting ? "cleric" : undefined,
      spellcastingAbility: payload.spellcasting ? "wisdom" : undefined,
      spellSaveDC: payload.spellcasting ? spellSaveDC : undefined,
      spellAttackBonus: payload.spellcasting ? spellAttackBonus : undefined,
      spellSlots: payload.spellcasting
        ? ({ "1": { max: 4, current: 4 }, "2": { max: 3, current: 3 }, "3": { max: 2, current: 2 } } as Prisma.InputJsonValue)
        : ({} as Prisma.InputJsonValue),
      knownSpells: payload.spellcasting ? (knownSpellIds as Prisma.InputJsonValue) : ([] as Prisma.InputJsonValue),
      skillTreeProgress: {
        [payload.skillTreeId]: { unlockedSkills: payload.unlockedSkills },
      } as Prisma.InputJsonValue,
    };

    if (char) {
      await prisma.character.update({
        where: { id: char.id },
        data: {
          level: 20,
          proficiencyBonus: pb20,
          maxHp: baseStats.maxHp,
          currentHp: baseStats.currentHp,
          spellSaveDC: baseStats.spellSaveDC ?? undefined,
          spellAttackBonus: baseStats.spellAttackBonus ?? undefined,
          spellSlots: baseStats.spellSlots,
          knownSpells: baseStats.knownSpells,
          skillTreeProgress: baseStats.skillTreeProgress,
        },
      });

      const existingCs = await prisma.characterSkills.findUnique({
        where: { characterId_skillTreeId: { characterId: char.id, skillTreeId: payload.skillTreeId } },
      });

      if (existingCs) {
        await prisma.characterSkills.update({
          where: { id: existingCs.id },
          data: { unlockedSkills: payload.unlockedSkills as Prisma.InputJsonValue },
        });
      } else {
        await prisma.characterSkills.create({
          data: {
            characterId: char.id,
            skillTreeId: payload.skillTreeId,
            unlockedSkills: payload.unlockedSkills as Prisma.InputJsonValue,
          },
        });
      }

      characterIds.push(char.id);
      console.log("Оновлено персонажа:", payload.name);
    } else {
      char = await prisma.character.create({
        data: baseStats,
      });
      await prisma.characterSkills.create({
        data: {
          characterId: char.id,
          skillTreeId: payload.skillTreeId,
          unlockedSkills: payload.unlockedSkills as Prisma.InputJsonValue,
        },
      });

      const weaponType = payload.class === "Fighter" ? AttackType.MELEE : payload.class === "Ranger" ? AttackType.RANGED : AttackType.MELEE;

      await prisma.characterInventory.create({
        data: {
          characterId: char.id,
          equipped: {
            mainHand: {
              id: `weapon-${char.id}`,
              name: payload.class === "Fighter" ? "Меч" : payload.class === "Ranger" ? "Лук" : "Булава",
              type: "weapon",
              attackBonus: pb20 + (payload.class === "Ranger" ? 4 : 3),
              damageDice: "2d6+4",
              damageType: "slashing",
              weaponType,
            },
          } as Prisma.InputJsonValue,
          backpack: [],
          gold: 0,
          silver: 0,
          copper: 0,
          items: [],
        },
      });
      characterIds.push(char.id);
      console.log("Створено персонажа:", payload.name);
    }
  }

  // --- 5 юнітів ---
  const unitNames = ["Ворог-1", "Ворог-2", "Ворог-3", "Ворог-4", "Ворог-5"];

  const unitIds: string[] = [];

  for (const name of unitNames) {
    let unit = await prisma.unit.findFirst({
      where: { campaignId: CAMPAIGN_ID, name },
    });

    if (!unit) {
      unit = await prisma.unit.create({
        data: {
          campaignId: CAMPAIGN_ID,
          name,
          level: 5,
          strength: 14,
          dexterity: 12,
          constitution: 14,
          intelligence: 8,
          wisdom: 10,
          charisma: 8,
          armorClass: 13,
          initiative: 1,
          speed: 30,
          maxHp: 45,
          proficiencyBonus: 3,
          attacks: [
            {
              id: "atk1",
              name: "Удар",
              type: AttackType.MELEE,
              attackBonus: 5,
              damageDice: "1d8+2",
              damageType: "bludgeoning",
            },
          ] as Prisma.InputJsonValue,
          specialAbilities: [] as Prisma.InputJsonValue,
          knownSpells: [] as Prisma.InputJsonValue,
        },
      });
      console.log("Створено юніта:", name);
    }

    unitIds.push(unit.id);
  }

  // --- Сцена бою ---
  const existingBattle = await prisma.battleScene.findFirst({
    where: { campaignId: CAMPAIGN_ID, name: "Тест 3v5" },
  });

  const participants: Array<{ id: string; type: "character" | "unit"; side: "ally" | "enemy" }> = [
    ...characterIds.map((id) => ({ id, type: "character" as const, side: "ally" as const })),
    ...unitIds.map((id) => ({ id, type: "unit" as const, side: "enemy" as const })),
  ];

  if (existingBattle) {
    await prisma.battleScene.update({
      where: { id: existingBattle.id },
      data: {
        status: "prepared",
        participants: participants as Prisma.InputJsonValue,
        initiativeOrder: [],
        currentRound: 1,
        currentTurnIndex: 0,
        battleLog: [],
      },
    });
    console.log("\nОновлено сцену бою: Тест 3v5, id =", existingBattle.id);
  } else {
    const battle = await prisma.battleScene.create({
      data: {
        campaignId: CAMPAIGN_ID,
        name: "Тест 3v5",
        description: "Генеральна перевірка: 3 герої (20 рівень) vs 5 юнітів",
        status: "prepared",
        participants: participants as Prisma.InputJsonValue,
        currentRound: 1,
        currentTurnIndex: 0,
        initiativeOrder: [],
        battleLog: [],
      },
    });

    console.log("\nСтворено сцену бою: Тест 3v5, id =", battle.id);
  }

  console.log("\nГотово. Далі: відкрийте бій у DM, натисніть «Почати бій», проведіть 3 раунди за планом у docs/BATTLE_TEST_PLAN_3V5.md");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
