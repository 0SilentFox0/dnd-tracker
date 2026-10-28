import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

import { importUnitsSchema } from "@/lib/schemas/units";
import { parseTable } from "@/lib/utils/content/import/table";
import { importUnitsIntoCampaign } from "@/lib/utils/units/import-units";
import { convertCSVRowToUnit } from "@/lib/utils/units/unit-parsing";
import { DEFAULT_CAMPAIGN_ID } from "@/scripts/shared/default-campaign";
import type { CSVUnitRow } from "@/types/import";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  const csvFilePath = args[0];

  if (!csvFilePath) {
    console.error("Використання: pnpm import-units <шлях до CSV> [campaignId]. Бібліотечні юніти сідяться через pnpm seed-library.");
    process.exit(1);
  }

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

  const table = parseTable(fileContent, filePath);

  const csvRows = table.rows as CSVUnitRow[];

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
