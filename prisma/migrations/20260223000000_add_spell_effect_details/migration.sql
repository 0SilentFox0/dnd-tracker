-- AlterTable
ALTER TABLE "spells" ADD COLUMN IF NOT EXISTS "effectDetails" JSONB;
