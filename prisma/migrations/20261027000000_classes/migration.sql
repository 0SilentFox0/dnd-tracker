-- AlterTable
ALTER TABLE "characters" ADD COLUMN "classes" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "hitDie" INTEGER NOT NULL DEFAULT 8,
    "savingThrows" JSONB NOT NULL DEFAULT '[]',
    "proficiencies" JSONB NOT NULL DEFAULT '{}',
    "skillChoices" JSONB NOT NULL DEFAULT '{}',
    "caster" TEXT NOT NULL DEFAULT 'none',
    "spellcastingAbility" TEXT,
    "features" JSONB NOT NULL DEFAULT '[]',
    "subclassLevel" INTEGER,
    "subclasses" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceId" TEXT,
    "sourceHash" TEXT,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "classes_campaignId_name_idx" ON "classes"("campaignId", "name");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "classes" ENABLE ROW LEVEL SECURITY;
