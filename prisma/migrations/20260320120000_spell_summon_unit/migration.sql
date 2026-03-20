-- AlterTable
ALTER TABLE "spells" ADD COLUMN "summonUnitId" TEXT;

-- AddForeignKey
ALTER TABLE "spells" ADD CONSTRAINT "spells_summonUnitId_fkey" FOREIGN KEY ("summonUnitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
