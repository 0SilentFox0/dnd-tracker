-- AlterTable
-- Додаємо поле damageDistribution для AoE-спелів. JSON-масив з % на кожну ціль.
-- Default: NULL (= усі цілі отримують 100%, backward-compat поведінка).
-- Приклад: [100, 75, 50, 25] — перша ціль 100%, друга 75%, ...
ALTER TABLE "spells" ADD COLUMN "damageDistribution" JSONB;
