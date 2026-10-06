-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "goals" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "primaryAbility" TEXT;

-- AlterTable
ALTER TABLE "races" ADD COLUMN     "icon" TEXT;
