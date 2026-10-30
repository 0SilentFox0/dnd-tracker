-- AlterTable
ALTER TABLE "spells" ADD COLUMN     "componentFlags" JSONB,
ADD COLUMN     "ingredients" JSONB NOT NULL DEFAULT '[]';
