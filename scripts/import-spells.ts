#!/usr/bin/env tsx
/**
 * Скрипт для імпорту заклинань з CSV або JSON файлу
 *
 * Використання:
 *   npm run import-spells <campaignId> <filePath> [groupId]
 *
 * Приклад:
 *   npm run import-spells abc123 imports/spells-import.csv
 *   npm run import-spells abc123 imports/spells.json my-group-id
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

import { DEFAULT_CAMPAIGN_ID } from "../lib/constants/campaigns";

const prisma = new PrismaClient();

interface SpellRow {
  name: string;
  level: string | number;
  school?: string;
  type?: "target" | "aoe";
  damageType?: "damage" | "heal";
  damageElement?: string;
  castingTime?: string;
  range?: string;
  components?: string;
  duration?: string;
  concentration?: string | boolean;
  damageDice?: string;
  savingThrowAbility?: string;
  savingThrowOnSuccess?: "half" | "none";
  description: string;
  groupId?: string;
}

function parseCSV(filePath: string): SpellRow[] {
  const content = fs.readFileSync(filePath, "utf-8");

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records as SpellRow[];
}

function parseJSON(filePath: string): SpellRow[] {
  const content = fs.readFileSync(filePath, "utf-8");

  return JSON.parse(content);
}

function normalizeSpell(row: SpellRow) {
  return {
    name: row.name.trim(),
    level:
      typeof row.level === "string"
        ? parseInt(row.level, 10) || 0
        : row.level || 0,
    school: row.school?.trim() || undefined,
    type: (row.type || "target") as "target" | "aoe",
    damageType: (row.damageType || "damage") as "damage" | "heal",
    damageElement: row.damageElement?.trim() || undefined,
    castingTime: row.castingTime?.trim() || undefined,
    range: row.range?.trim() || undefined,
    components: row.components?.trim() || undefined,
    duration: row.duration?.trim() || undefined,
    concentration:
      typeof row.concentration === "boolean"
        ? row.concentration
        : row.concentration?.toLowerCase() === "true" ||
          row.concentration === "1" ||
          row.concentration === "так",
    damageDice: row.damageDice?.trim() || undefined,
    savingThrowAbility: row.savingThrowAbility?.toLowerCase() as
      | "strength"
      | "dexterity"
      | "constitution"
      | "intelligence"
      | "wisdom"
      | "charisma"
      | undefined,
    savingThrowOnSuccess: (row.savingThrowOnSuccess || "half") as
      | "half"
      | "none",
    description: row.description.trim(),
    groupId: row.groupId?.trim() || undefined,
  };
}

async function importSpells(
  campaignId: string,
  filePath: string,
  groupId?: string,
) {
  try {
    const fullPath = path.resolve(filePath);

    const ext = path.extname(fullPath).toLowerCase();

    let spells: SpellRow[];

    if (ext === ".csv") {
      spells = parseCSV(fullPath);
    } else if (ext === ".json") {
      spells = parseJSON(fullPath);
    } else {
      throw new Error(
        `Непідтримуваний формат файлу: ${ext}. Підтримуються .csv та .json`,
      );
    }

    console.log(`Знайдено ${spells.length} заклинань для імпорту`);

    // Нормалізуємо дані
    const normalizedSpells = spells.map(normalizeSpell);

    // Створюємо заклинання
    const spellsToCreate = normalizedSpells.map((spell) => ({
      campaignId,
      name: spell.name,
      level: spell.level,
      school: spell.school || null,
      type: spell.type,
      damageType: spell.damageType,
      damageElement: spell.damageElement || null,
      castingTime: spell.castingTime || null,
      range: spell.range || null,
      components: spell.components || null,
      duration: spell.duration || null,
      concentration: spell.concentration ?? false,
      damageDice: spell.damageDice || null,
      savingThrow: spell.savingThrowAbility
        ? ({
            ability: spell.savingThrowAbility,
            onSuccess: spell.savingThrowOnSuccess,
          } as { ability: string; onSuccess: "half" | "none" })
        : Prisma.JsonNull,
      description: spell.description,
      groupId: spell.groupId || groupId || null,
    }));

    const result = await prisma.spell.createMany({
      data: spellsToCreate,
      skipDuplicates: true,
    });

    console.log(
      `✅ Успішно імпортовано ${result.count} заклинань з ${spells.length}`,
    );
    console.log(`   Пропущено дублікатів: ${spells.length - result.count}`);

    return result;
  } catch (error) {
    console.error("❌ Помилка імпорту:", error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Використовуємо дефолтні значення якщо не вказано
  const filePath = args[0] || "imports/spells-import.csv";

  const campaignId = args[1] || DEFAULT_CAMPAIGN_ID;

  const groupId = args[2];

  console.log(`Використання файлу: ${filePath}`);
  console.log(`Використання кампанії: ${campaignId}`);

  try {
    await importSpells(campaignId, filePath, groupId);
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

export { importSpells };
