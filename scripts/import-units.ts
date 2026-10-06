import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

import { importUnitsSchema } from "../lib/schemas/units";
import { convertCSVRowToUnit } from "../lib/utils/common/unit-parsing";
import { importUnitsIntoCampaign } from "../lib/utils/units/import-units";
import type { CSVUnitRow } from "../types/import";
import { DEFAULT_CAMPAIGN_ID } from "./default-campaign";

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

      values.splice(
        lastIndex,
        values.length - lastIndex,
        extraValues.join(", "),
      );
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

  const { units } = importUnitsSchema.parse({ units: csvRows.map(convertCSVRowToUnit) });

  const report = await importUnitsIntoCampaign(prisma, campaignId, units);

  console.log(`✅ Імпортовано: ${report.imported}`);
  console.log(`   - Пропущено (така назва вже є): ${report.skipped}`);
  console.log(`   - Всього: ${report.total}`);

  if (report.unknownRaces.length > 0) {
    console.warn(`⚠️  Раси не знайдено (юніти без раси): ${report.unknownRaces.join(", ")}`);
  }
}

main()
  .catch((e) => {
    console.error("Помилка при імпорті:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
