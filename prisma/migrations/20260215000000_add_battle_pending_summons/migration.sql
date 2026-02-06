-- AlterTable
ALTER TABLE "battle_scenes" ADD COLUMN IF NOT EXISTS "pendingSummons" JSONB NOT NULL DEFAULT '[]';
