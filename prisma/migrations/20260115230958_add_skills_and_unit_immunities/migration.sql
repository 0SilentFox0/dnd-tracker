-- AlterTable
ALTER TABLE "units" ADD COLUMN "immunities" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "races" JSONB NOT NULL DEFAULT '[]',
    "isRacial" BOOLEAN NOT NULL DEFAULT false,
    "bonuses" JSONB NOT NULL DEFAULT '{}',
    "damage" INTEGER,
    "armor" INTEGER,
    "speed" INTEGER,
    "physicalResistance" INTEGER,
    "magicalResistance" INTEGER,
    "spellId" TEXT,
    "spellGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "spells"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_spellGroupId_fkey" FOREIGN KEY ("spellGroupId") REFERENCES "spell_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
