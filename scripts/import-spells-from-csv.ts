#!/usr/bin/env tsx
/**
 * Скрипт для імпорту заклинань з CSV з автоматичним створенням груп
 * 
 * Використання:
 *   npm run import-spells-csv <campaignId> <csvContent>
 * 
 * Або можна передати шлях до файлу:
 *   npm run import-spells-csv <campaignId> <filePath>
 */

import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import * as fs from "fs";

import { DEFAULT_CAMPAIGN_ID } from "../lib/constants/campaigns";

const prisma = new PrismaClient();

interface SpellRow {
  School: string;
  Level: string;
  "UA Name": string;
  "Original Name": string;
  Effect: string;
}

interface SpellGroup {
  [key: string]: string; // school name -> groupId
}

async function getOrCreateSpellGroup(
  campaignId: string,
  schoolName: string
): Promise<string> {
  // Перевіряємо чи існує група
  const existing = await prisma.spellGroup.findFirst({
    where: {
      campaignId,
      name: schoolName,
    },
  });

  if (existing) {
    return existing.id;
  }

  // Створюємо нову групу
  const group = await prisma.spellGroup.create({
    data: {
      campaignId,
      name: schoolName,
    },
  });

  return group.id;
}

function parseLevel(levelStr: string): number {
  const level = parseInt(levelStr.trim(), 10);

  return isNaN(level) ? 0 : level;
}

function parseSpellType(effect: string): "target" | "aoe" {
  const lower = effect.toLowerCase();

  if (lower.includes("aoe") || lower.includes("всі") || lower.includes("коло") || lower.includes("лінія") || lower.includes("стіна")) {
    return "aoe";
  }

  return "target";
}

function parseDamageType(effect: string): "damage" | "heal" {
  const lower = effect.toLowerCase();

  if (lower.includes("heal") || lower.includes("лікування") || lower.includes("регенерація") || lower.includes("воскресіння") || lower.includes("revive")) {
    return "heal";
  }

  return "damage";
}

function parseDamageElement(effect: string): string | undefined {
  const lower = effect.toLowerCase();

  const map: Array<{ value: string; keywords: string[] }> = [
    { value: "fire", keywords: ["fire", "вогонь", "полум", "burn"] },
    { value: "cold", keywords: ["cold", "ice", "лід", "криж"] },
    { value: "lightning", keywords: ["lightning", "bolt", "блискав"] },
    { value: "acid", keywords: ["acid", "кислот"] },
    { value: "poison", keywords: ["poison", "отрут"] },
    { value: "necrotic", keywords: ["necrotic", "некрот"] },
    { value: "radiant", keywords: ["radiant", "світл"] },
    { value: "thunder", keywords: ["thunder", "грім"] },
    { value: "psychic", keywords: ["psychic", "психіч"] },
    { value: "force", keywords: ["force", "сила"] },
  ];

  const match = map.find((item) =>
    item.keywords.some((keyword) => lower.includes(keyword))
  );

  return match?.value;
}

function extractDamageDice(effect: string): string | undefined {
  // Шукаємо патерни типу "3d10", "8d6", "2d8 + MOD" тощо
  const diceMatch = effect.match(/(\d+d\d+[\s\+]*[\w]*)/i);

  if (diceMatch) {
    return diceMatch[1].trim();
  }

  return undefined;
}

function extractSavingThrow(effect: string): {
  ability?: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
  onSuccess?: "half" | "none";
} {
  const lower = effect.toLowerCase();

  const abilities = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
  
  for (const ability of abilities) {
    if (lower.includes(ability)) {
      return {
        ability: ability as "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma",
        onSuccess: lower.includes("half") || lower.includes("/2") ? "half" : "none",
      };
    }
  }

  // Перевіряємо українські назви
  if (lower.includes("сила")) return { ability: "strength", onSuccess: "half" };

  if (lower.includes("спритність")) return { ability: "dexterity", onSuccess: "half" };

  if (lower.includes("статура")) return { ability: "constitution", onSuccess: "half" };

  if (lower.includes("інтелект")) return { ability: "intelligence", onSuccess: "half" };

  if (lower.includes("мудрість")) return { ability: "wisdom", onSuccess: "half" };

  if (lower.includes("харизма")) return { ability: "charisma", onSuccess: "half" };

  return {};
}

function parseConcentration(effect: string): boolean {
  const lower = effect.toLowerCase();

  return lower.includes("conc.") || lower.includes("concentration") || lower.includes("концентрація");
}

async function importSpellsFromCSV(campaignId: string, csvContent: string) {
  try {
    // Парсимо CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // Дозволяє невідповідність кількості колонок
      relax_quotes: true, // Більш м'яка обробка лапок
    }) as SpellRow[];

    console.log(`Знайдено ${records.length} заклинань для імпорту`);

    // Створюємо або отримуємо групи заклинань
    const spellGroups: SpellGroup = {};

    const uniqueSchools = [...new Set(records.map((r) => r.School.trim()))];

    console.log(`Створюємо групи заклинань: ${uniqueSchools.join(", ")}`);

    for (const school of uniqueSchools) {
      const groupId = await getOrCreateSpellGroup(campaignId, school);

      spellGroups[school] = groupId;
      console.log(`  ✓ Група "${school}": ${groupId}`);
    }

    // Конвертуємо заклинання в правильний формат
    const spellsToCreate = records.map((row) => {
      const level = parseLevel(row.Level);

      const effect = row.Effect.trim();

      const damageDice = extractDamageDice(effect);

      const savingThrow = extractSavingThrow(effect);

      const concentration = parseConcentration(effect);

      const type = parseSpellType(effect);

      const damageType = parseDamageType(effect);

      const damageElement = parseDamageElement(effect);

      // Визначаємо школу магії (можна покращити маппінг)
      let school = "";

      if (row.School === "Dark") school = "Necromancy";
      else if (row.School === "Destr") school = "Evocation";
      else if (row.School === "Summ") school = "Conjuration";
      else if (row.School === "Light") school = "Abjuration";
      else school = row.School;

      return {
        campaignId,
        name: row["UA Name"].trim(),
        level,
        school: school || null,
        type,
        damageType,
        damageElement: damageElement || null,
        castingTime: "1 action", // За замовчуванням
        range: type === "aoe" ? "60 feet" : "Touch", // Можна покращити
        components: "V, S", // За замовчуванням
        duration: concentration ? "Concentration, up to 1 minute" : "Instantaneous",
        concentration,
        damageDice: damageDice || null,
        savingThrow: savingThrow.ability
          ? ({
              ability: savingThrow.ability,
              onSuccess: savingThrow.onSuccess || "half",
            } as { ability: string; onSuccess: "half" | "none" })
          : undefined,
        description: `${row["Original Name"]} (${row["UA Name"]}): ${effect}`,
        groupId: spellGroups[row.School.trim()],
      };
    });

    // Імпортуємо заклинання
    console.log(`\nІмпортую ${spellsToCreate.length} заклинань...`);

    const result = await prisma.spell.createMany({
      data: spellsToCreate,
      skipDuplicates: true,
    });

    console.log(`\n✅ Успішно імпортовано ${result.count} заклинань з ${records.length}`);
    console.log(`   Пропущено дублікатів: ${records.length - result.count}`);

    // Показуємо статистику по групах
    console.log(`\nСтатистика по групах:`);
    for (const [school, groupId] of Object.entries(spellGroups)) {
      const count = await prisma.spell.count({
        where: {
          campaignId,
          groupId,
        },
      });

      console.log(`  ${school}: ${count} заклинань`);
    }

    return result;
  } catch (error) {
    console.error("❌ Помилка імпорту:", error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Використовуємо дефолтні значення якщо не вказано
  const csvInput = args[0] || "imports/spells-import.csv";

  const campaignId = args[1] || DEFAULT_CAMPAIGN_ID;

  console.log(`Використання кампанії: ${campaignId}`);

  try {
    let csvContent: string;

    // Перевіряємо чи це шлях до файлу
    if (fs.existsSync(csvInput)) {
      csvContent = fs.readFileSync(csvInput, "utf-8");
    } else {
      // Інакше це сам CSV контент
      csvContent = csvInput;
    }

    await importSpellsFromCSV(campaignId, csvContent);
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { importSpellsFromCSV };
