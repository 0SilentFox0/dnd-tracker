-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "baseSourceId" TEXT,
ADD COLUMN     "baseVersion" INTEGER;

-- CreateTable
CREATE TABLE "spells_base" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "executionMode" TEXT NOT NULL DEFAULT 'native',
    "level" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "damageType" TEXT NOT NULL,
    "castingTime" TEXT,
    "range" TEXT,
    "components" TEXT,
    "duration" TEXT,
    "concentration" BOOLEAN NOT NULL DEFAULT false,
    "ritual" BOOLEAN NOT NULL DEFAULT false,
    "savingThrow" JSONB,
    "hitCheck" JSONB,
    "description" TEXT,
    "effects" JSONB,
    "effectDetails" JSONB,
    "groupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "damageElement" TEXT,
    "icon" TEXT,
    "target" TEXT,
    "damageModifier" TEXT,
    "healModifier" TEXT,
    "diceCount" INTEGER,
    "diceType" TEXT,
    "appearanceDescription" TEXT,
    "fx" JSONB,
    "damageDistribution" JSONB,
    "dice" INTEGER NOT NULL DEFAULT 0,
    "cost" TEXT NOT NULL DEFAULT 'action',
    "casting" JSONB,
    "targeting" JSONB NOT NULL DEFAULT '{"kind":"enemy"}',
    "resolution" JSONB NOT NULL DEFAULT '{"kind":"auto"}',
    "spellEffects" JSONB NOT NULL DEFAULT '[]',
    "raceModifiers" JSONB NOT NULL DEFAULT '[]',
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "maxStacks" INTEGER,
    "dieSides" INTEGER,
    "upcastDice" INTEGER,
    "upcastTargets" INTEGER,
    "addAbilityMod" BOOLEAN,
    "fixedDice" BOOLEAN,
    "damageBonus" INTEGER,
    "lists" JSONB NOT NULL DEFAULT '[]',
    "ingredients" JSONB NOT NULL DEFAULT '[]',
    "componentFlags" JSONB,
    "summonUnitId" TEXT,
    "sourceCampaignId" TEXT NOT NULL,
    "validFrom" INTEGER NOT NULL,
    "validTo" INTEGER,

    CONSTRAINT "spells_base_pkey" PRIMARY KEY ("id","validFrom")
);

-- CreateTable
CREATE TABLE "spell_groups_base" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceCampaignId" TEXT NOT NULL,
    "validFrom" INTEGER NOT NULL,
    "validTo" INTEGER,

    CONSTRAINT "spell_groups_base_pkey" PRIMARY KEY ("id","validFrom")
);

-- CreateTable
CREATE TABLE "campaign_content_hides" (
    "campaignId" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "id" TEXT NOT NULL,

    CONSTRAINT "campaign_content_hides_pkey" PRIMARY KEY ("campaignId","table","id")
);

-- CreateIndex
CREATE INDEX "spells_base_sourceCampaignId_validFrom_validTo_idx" ON "spells_base"("sourceCampaignId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "spell_groups_base_sourceCampaignId_validFrom_validTo_idx" ON "spell_groups_base"("sourceCampaignId", "validFrom", "validTo");

ALTER TABLE "spells_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "spell_groups_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_content_hides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "spells" DROP CONSTRAINT "spells_groupId_fkey";
