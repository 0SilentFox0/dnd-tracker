import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import type { CSVUnitRow } from "../lib/types/unit-import";
import { convertCSVRowToUnit } from "../lib/utils/unit-parsing";
import { DEFAULT_CAMPAIGN_ID } from "../lib/constants/campaigns";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  
  // Використовуємо дефолтні значення якщо не вказано
  const csvFilePath = args[0] || "imports/units-import.csv";
  const campaignId = args[1] || DEFAULT_CAMPAIGN_ID;

  console.log(`Використання файлу: ${csvFilePath}`);
  console.log(`Використання кампанії: ${campaignId}`);

  // Перевіряємо чи існує кампанія
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    console.error(`Кампанія з ID ${campaignId} не знайдена`);
    process.exit(1);
  }

  console.log(`Імпорт юнітів для кампанії: ${campaign.name}`);

  // Читаємо CSV файл
  const filePath = path.resolve(process.cwd(), csvFilePath);
  if (!fs.existsSync(filePath)) {
    console.error(`Файл ${filePath} не знайдено`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n").filter((line) => line.trim());
  
  if (lines.length === 0) {
    console.error("CSV файл порожній");
    process.exit(1);
  }

  // Простий CSV парсер для Node.js з правильним обробленням лапок та крапкою з комою як роздільником
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = i < line.length - 1 ? line[i + 1] : null;

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Подвійні лапки - екранована лапка
          current += '"';
          i++; // Пропускаємо наступну лапку
        } else {
          // Початок або кінець лапок
          inQuotes = !inQuotes;
        }
      } else if (char === ";" && !inQuotes) {
        // Крапка з комою як роздільник поза лапками
        result.push(current.trim());
        current = "";
      } else {
        // Звичайний символ
        current += char;
      }
    }
    // Додаємо останнє поле
    result.push(current.trim());
    return result;
  };

  // Парсимо заголовки
  const headers = parseCSVLine(lines[0]);
  const csvRows: CSVUnitRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length > headers.length) {
      const lastIndex = headers.length - 1;
      const extraValues = values.slice(lastIndex);
      values.splice(lastIndex, values.length - lastIndex, extraValues.join(", "));
    }

    if (values.length < headers.length) {
      while (values.length < headers.length) {
        values.push("");
      }
    }

    const row = {} as CSVUnitRow;
    headers.forEach((header, index) => {
      let value = values[index] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      row[header] = value;
    });
    
    // Дебаг: перевіряємо перший рядок
    if (csvRows.length === 0) {
      console.log("Перший рядок після парсингу:", {
        headers: headers.length,
        values: values.length,
        group: row.Група || row.group || row.Group,
        name: row.Назва || row.name || row.Name,
      });
    }
    
    csvRows.push(row);
  }

  console.log(`Знайдено ${csvRows.length} рядків у CSV файлі`);

  // Конвертуємо в формат для імпорту
  const unitsWithGroups = csvRows.map((row) => {
    // Беремо групу напряму з CSV рядка - це остання колонка
    // Перевіряємо різні варіанти назв колонки
    const rawGroup = (row.Група || row.group || row.Group || "").trim();
    const { unit, groupName } = convertCSVRowToUnit(row);
    
    // Використовуємо rawGroup якщо він є, інакше groupName з парсера
    const finalGroupName = rawGroup || groupName || undefined;
    
    if (!finalGroupName) {
      console.warn(`⚠️  Для юніта "${unit.name}" група не знайдена`);
    }
    
    return {
      ...unit,
      groupName: finalGroupName,
    };
  });

  // Створюємо або отримуємо групи юнітів
  const unitGroups: Record<string, string> = {};
  const uniqueGroupNames = new Set<string>();

  for (const unit of unitsWithGroups) {
    const groupName = unit.groupName;
    if (groupName) {
      uniqueGroupNames.add(groupName.trim());
    }
  }
  
  console.log(`Знайдені групи: ${Array.from(uniqueGroupNames).join(", ")}`);

  console.log(`Створення/отримання ${uniqueGroupNames.size} груп...`);

  for (const groupName of uniqueGroupNames) {
    const existing = await prisma.unitGroup.findFirst({
      where: { campaignId, name: groupName },
    });
    if (existing) {
      unitGroups[groupName] = existing.id;
      console.log(`  Група "${groupName}" вже існує`);
    } else {
      // Генеруємо колір для групи
      const colors = [
        "#ef4444", // red
        "#f97316", // orange
        "#eab308", // yellow
        "#22c55e", // green
        "#3b82f6", // blue
        "#8b5cf6", // purple
        "#ec4899", // pink
      ];
      const colorIndex = Array.from(uniqueGroupNames).indexOf(groupName);
      const color = colors[colorIndex % colors.length];

      const group = await prisma.unitGroup.create({
        data: { campaignId, name: groupName, color },
      });
      unitGroups[groupName] = group.id;
      console.log(`  Створено групу "${groupName}" з кольором ${color}`);
    }
  }

  // Перевіряємо існуючі юніти для уникнення дублікатів
  const existingUnitNames = await prisma.unit.findMany({
    where: {
      campaignId,
      name: {
        in: unitsWithGroups.map((u) => u.name),
      },
    },
    select: {
      name: true,
    },
  });

  const existingNamesSet = new Set(existingUnitNames.map((u) => u.name));
  const unitsToCreate = unitsWithGroups.filter(
    (unit) => !existingNamesSet.has(unit.name)
  );

  if (unitsToCreate.length === 0) {
    console.log("Всі юніти вже існують в кампанії");
    return;
  }

  console.log(
    `Створення ${unitsToCreate.length} нових юнітів (пропущено ${unitsWithGroups.length - unitsToCreate.length} дублікатів)...`
  );

  // Отримуємо кольори груп один раз
  const groupColors: Record<string, string> = {};
  for (const [groupName, groupId] of Object.entries(unitGroups)) {
    const group = await prisma.unitGroup.findUnique({
      where: { id: groupId },
    });
    if (group) {
      groupColors[groupName] = group.color;
    }
  }

  // Підготовлюємо дані для масового створення
  const unitsData = unitsToCreate.map((unit) => {
    const groupName = unit.groupName;
    const groupId = groupName ? unitGroups[groupName] : undefined;
    const groupColor = groupName ? groupColors[groupName] || null : null;

    return {
      campaignId,
      name: unit.name,
      groupId: groupId || null,
      groupColor,
      level: unit.level,
      strength: unit.strength,
      dexterity: unit.dexterity,
      constitution: unit.constitution,
      intelligence: unit.intelligence,
      wisdom: unit.wisdom,
      charisma: unit.charisma,
      armorClass: unit.armorClass,
      initiative: unit.initiative,
      speed: unit.speed,
      maxHp: unit.maxHp,
      proficiencyBonus: unit.proficiencyBonus,
      attacks: unit.attacks as any,
      specialAbilities: unit.specialAbilities as any,
      knownSpells: unit.knownSpells,
      avatar: unit.avatar || null,
    };
  });

  // Створюємо юніти масово
  const result = await prisma.unit.createMany({
    data: unitsData,
    skipDuplicates: true,
  });

  // Отримуємо створені юніти для повернення
  const createdUnits = await prisma.unit.findMany({
    where: {
      campaignId,
      name: {
        in: unitsToCreate.map((u) => u.name),
      },
    },
    include: {
      unitGroup: true,
    },
  });

  console.log(`✅ Успішно створено ${result.count} юнітів`);
  console.log(`   - Імпортовано: ${result.count}`);
  console.log(`   - Пропущено: ${unitsWithGroups.length - result.count}`);
  console.log(`   - Всього: ${unitsWithGroups.length}`);
}

main()
  .catch((e) => {
    console.error("Помилка при імпорті:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
