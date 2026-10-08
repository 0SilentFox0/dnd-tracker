-- AlterTable
ALTER TABLE "spells" ADD COLUMN     "maxStacks" INTEGER,
ADD COLUMN     "stackable" BOOLEAN NOT NULL DEFAULT false;
