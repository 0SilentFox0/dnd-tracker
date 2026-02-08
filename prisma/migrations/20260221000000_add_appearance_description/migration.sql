-- AlterTable
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "appearanceDescription" TEXT;

-- AlterTable
ALTER TABLE "spells" ADD COLUMN IF NOT EXISTS "appearanceDescription" TEXT;
