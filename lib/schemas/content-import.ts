import { z } from "zod";

import { IMPORT_LIMITS, IMPORT_MODES } from "@/lib/utils/content/import/kinds";

export const contentImportSchema = z.object({
  rows: z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(IMPORT_LIMITS.rowsPerRequest)
    .describe("Рядки: ключі — поля імпорту виду (як у тілі create; у skills — плоскі name, description, icon, image, mainSkillId, spellId, spellGroupId, grantedSpellId, abilities); посилання — назвою або id цієї кампанії; значення можна давати текстом, як у CSV"),
  mode: z.enum(IMPORT_MODES).default("create").describe("create — дубль назви = помилка рядка; update — оновити за назвою, інакше створити; skip — наявні пропустити"),
  dryRun: z.boolean().default(false).describe("Лише перевірка, без запису"),
});

export type ContentImportInput = z.infer<typeof contentImportSchema>;

export const aiMapRequestSchema = z.object({
  headers: z.array(z.string().max(200)).min(1).max(IMPORT_LIMITS.aiHeaders),
  sample: z.array(z.record(z.string(), z.string().max(IMPORT_LIMITS.aiCellChars))).max(IMPORT_LIMITS.aiSampleRows),
});

export type AiMapRequest = z.infer<typeof aiMapRequestSchema>;
