-- AlterTable
ALTER TABLE "main_skills" ADD COLUMN "spellGroupId" TEXT;

-- AddForeignKey
ALTER TABLE "main_skills" ADD CONSTRAINT "main_skills_spellGroupId_fkey" FOREIGN KEY ("spellGroupId") REFERENCES "spell_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
