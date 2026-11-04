-- Base storage for published template versions (13 content models + campaign_content_hides).
-- Content rows may reference ids that live only in *_base, so the FKs between content models
-- (and from character_skills/characters to them) are dropped; references are resolved by the read layer.
-- Prisma relation fields stay in schema.prisma, so `prisma migrate diff` will want these 12 FKs back
-- (see lib/db/content-layer.ts); FKs to "campaigns" (ON DELETE CASCADE) are untouched.
-- Behaviour dropped with the FKs: ON DELETE SET NULL (10), character_skills.skillTreeId CASCADE, characters.backgroundId RESTRICT.
-- Expand-only: touches no data.

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "baseSourceId" TEXT,
ADD COLUMN     "baseVersion" INTEGER;

-- CreateTable
CREATE TABLE "campaign_content_hides" (
    "campaignId" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "id" TEXT NOT NULL,

    CONSTRAINT "campaign_content_hides_pkey" PRIMARY KEY ("campaignId","table","id")
);

-- CreateTable
CREATE TABLE "units_base" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "raceId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "strength" INTEGER NOT NULL DEFAULT 10,
    "dexterity" INTEGER NOT NULL DEFAULT 10,
    "constitution" INTEGER NOT NULL DEFAULT 10,
    "intelligence" INTEGER NOT NULL DEFAULT 10,
    "wisdom" INTEGER NOT NULL DEFAULT 10,
    "charisma" INTEGER NOT NULL DEFAULT 10,
    "armorClass" INTEGER NOT NULL DEFAULT 10,
    "initiative" INTEGER NOT NULL DEFAULT 0,
    "speed" INTEGER NOT NULL DEFAULT 30,
    "gridSize" INTEGER NOT NULL DEFAULT 1,
    "maxHp" INTEGER NOT NULL DEFAULT 10,
    "proficiencyBonus" INTEGER NOT NULL DEFAULT 2,
    "attacks" JSONB NOT NULL DEFAULT '[]',
    "knownSpells" JSONB NOT NULL DEFAULT '[]',
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "immunities" JSONB NOT NULL DEFAULT '[]',
    "morale" INTEGER NOT NULL DEFAULT 0,
    "maxTargets" INTEGER NOT NULL DEFAULT 1,
    "minTargets" INTEGER NOT NULL DEFAULT 1,
    "abilities" JSONB NOT NULL DEFAULT '[]',
    "levelScaling" JSONB,
    "cr" DOUBLE PRECISION,
    "xp" INTEGER,
    "multiattack" INTEGER NOT NULL DEFAULT 1,
    "legendaryActions" INTEGER NOT NULL DEFAULT 0,
    "legendaryResistances" INTEGER NOT NULL DEFAULT 0,
    "saveProficiencies" JSONB NOT NULL DEFAULT '[]',
    "statblock" JSONB NOT NULL DEFAULT '{}',
    "spellcasting" JSONB NOT NULL DEFAULT '{}',
    "sourceCampaignId" TEXT NOT NULL,
    "validFrom" INTEGER NOT NULL,
    "validTo" INTEGER,

    CONSTRAINT "units_base_pkey" PRIMARY KEY ("id","validFrom")
);

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
CREATE TABLE "artifacts_base" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rarity" TEXT,
    "slot" TEXT NOT NULL,
    "bonuses" JSONB NOT NULL DEFAULT '{}',
    "modifiers" JSONB NOT NULL DEFAULT '[]',
    "setId" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abilities" JSONB NOT NULL DEFAULT '[]',
    "sourceCampaignId" TEXT NOT NULL,
    "validFrom" INTEGER NOT NULL,
    "validTo" INTEGER,

    CONSTRAINT "artifacts_base_pkey" PRIMARY KEY ("id","validFrom")
);

-- CreateTable
CREATE TABLE "artifact_sets_base" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "setBonus" JSONB,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abilities" JSONB NOT NULL DEFAULT '[]',
    "sourceCampaignId" TEXT NOT NULL,
    "validFrom" INTEGER NOT NULL,
    "validTo" INTEGER,

    CONSTRAINT "artifact_sets_base_pkey" PRIMARY KEY ("id","validFrom")
);

-- CreateTable
CREATE TABLE "skill_trees_base" (
    "id" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceCampaignId" TEXT NOT NULL,
    "validFrom" INTEGER NOT NULL,
    "validTo" INTEGER,

    CONSTRAINT "skill_trees_base_pkey" PRIMARY KEY ("id","validFrom")
);

-- CreateTable
CREATE TABLE "campaign_tracks_base" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT,
    "youtubeId" TEXT,
    "durationSec" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceCampaignId" TEXT NOT NULL,
    "validFrom" INTEGER NOT NULL,
    "validTo" INTEGER,

    CONSTRAINT "campaign_tracks_base_pkey" PRIMARY KEY ("id","validFrom")
);

-- CreateTable
CREATE TABLE "skills_base" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "spellId" TEXT,
    "spellGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "icon" TEXT,
    "image" TEXT,
    "mainSkillId" TEXT,
    "spellEnhancementTypes" JSONB NOT NULL DEFAULT '[]',
    "spellEffectIncrease" INTEGER,
    "spellTargetChange" JSONB,
    "spellAdditionalModifier" JSONB,
    "spellNewSpellId" TEXT,
    "grantedSpellId" TEXT,
    "spellEnhancementData" JSONB NOT NULL DEFAULT '{}',
    "appearanceDescription" TEXT,
    "abilities" JSONB NOT NULL DEFAULT '[]',
    "sourceCampaignId" TEXT NOT NULL,
    "validFrom" INTEGER NOT NULL,
    "validTo" INTEGER,

    CONSTRAINT "skills_base_pkey" PRIMARY KEY ("id","validFrom")
);

-- CreateTable
CREATE TABLE "races_base" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "availableSkills" JSONB NOT NULL DEFAULT '[]',
    "disabledSkills" JSONB NOT NULL DEFAULT '[]',
    "passiveAbility" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "spellSlotProgression" JSONB NOT NULL DEFAULT '[]',
    "abilities" JSONB NOT NULL DEFAULT '[]',
    "choices" JSONB NOT NULL DEFAULT '[]',
    "icon" TEXT,
    "color" TEXT,
    "sourceCampaignId" TEXT NOT NULL,
    "validFrom" INTEGER NOT NULL,
    "validTo" INTEGER,

    CONSTRAINT "races_base_pkey" PRIMARY KEY ("id","validFrom")
);

-- CreateTable
CREATE TABLE "classes_base" (
    "id" TEXT NOT NULL,
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
    "columns" JSONB NOT NULL DEFAULT '[]',
    "spellList" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceCampaignId" TEXT NOT NULL,
    "validFrom" INTEGER NOT NULL,
    "validTo" INTEGER,

    CONSTRAINT "classes_base_pkey" PRIMARY KEY ("id","validFrom")
);

-- CreateTable
CREATE TABLE "feats_base" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "type" TEXT NOT NULL DEFAULT 'general',
    "prerequisite" JSONB NOT NULL DEFAULT '{}',
    "repeatable" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "abilities" JSONB NOT NULL DEFAULT '[]',
    "choices" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceCampaignId" TEXT NOT NULL,
    "validFrom" INTEGER NOT NULL,
    "validTo" INTEGER,

    CONSTRAINT "feats_base_pkey" PRIMARY KEY ("id","validFrom")
);

-- CreateTable
CREATE TABLE "backgrounds_base" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "choices" JSONB NOT NULL DEFAULT '[]',
    "skillProficiencies" JSONB NOT NULL DEFAULT '[]',
    "toolProficiencies" JSONB NOT NULL DEFAULT '[]',
    "originFeatId" TEXT,
    "equipmentText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceCampaignId" TEXT NOT NULL,
    "validFrom" INTEGER NOT NULL,
    "validTo" INTEGER,

    CONSTRAINT "backgrounds_base_pkey" PRIMARY KEY ("id","validFrom")
);

-- CreateTable
CREATE TABLE "main_skills_base" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT,
    "isEnableInSkillTree" BOOLEAN NOT NULL DEFAULT false,
    "spellGroupId" TEXT,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceCampaignId" TEXT NOT NULL,
    "validFrom" INTEGER NOT NULL,
    "validTo" INTEGER,

    CONSTRAINT "main_skills_base_pkey" PRIMARY KEY ("id","validFrom")
);

-- CreateIndex
CREATE INDEX "units_base_sourceCampaignId_validFrom_validTo_idx" ON "units_base"("sourceCampaignId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "spells_base_sourceCampaignId_validFrom_validTo_idx" ON "spells_base"("sourceCampaignId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "spell_groups_base_sourceCampaignId_validFrom_validTo_idx" ON "spell_groups_base"("sourceCampaignId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "artifacts_base_sourceCampaignId_validFrom_validTo_idx" ON "artifacts_base"("sourceCampaignId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "artifact_sets_base_sourceCampaignId_validFrom_validTo_idx" ON "artifact_sets_base"("sourceCampaignId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "skill_trees_base_sourceCampaignId_validFrom_validTo_idx" ON "skill_trees_base"("sourceCampaignId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "campaign_tracks_base_sourceCampaignId_validFrom_validTo_idx" ON "campaign_tracks_base"("sourceCampaignId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "skills_base_sourceCampaignId_validFrom_validTo_idx" ON "skills_base"("sourceCampaignId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "races_base_sourceCampaignId_validFrom_validTo_idx" ON "races_base"("sourceCampaignId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "classes_base_sourceCampaignId_validFrom_validTo_idx" ON "classes_base"("sourceCampaignId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "feats_base_sourceCampaignId_validFrom_validTo_idx" ON "feats_base"("sourceCampaignId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "backgrounds_base_sourceCampaignId_validFrom_validTo_idx" ON "backgrounds_base"("sourceCampaignId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "main_skills_base_sourceCampaignId_validFrom_validTo_idx" ON "main_skills_base"("sourceCampaignId", "validFrom", "validTo");


ALTER TABLE "campaign_content_hides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "units_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "spells_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "spell_groups_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "artifacts_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "artifact_sets_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skill_trees_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_tracks_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skills_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "races_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "classes_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feats_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "backgrounds_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "main_skills_base" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "artifacts" DROP CONSTRAINT "artifacts_setId_fkey";
ALTER TABLE "character_skills" DROP CONSTRAINT "character_skills_skillTreeId_fkey";
ALTER TABLE "characters" DROP CONSTRAINT "characters_backgroundId_fkey";
ALTER TABLE "main_skills" DROP CONSTRAINT "main_skills_spellGroupId_fkey";
ALTER TABLE "skills" DROP CONSTRAINT "skills_grantedSpellId_fkey";
ALTER TABLE "skills" DROP CONSTRAINT "skills_mainSkillId_fkey";
ALTER TABLE "skills" DROP CONSTRAINT "skills_spellGroupId_fkey";
ALTER TABLE "skills" DROP CONSTRAINT "skills_spellId_fkey";
ALTER TABLE "skills" DROP CONSTRAINT "skills_spellNewSpellId_fkey";
ALTER TABLE "spells" DROP CONSTRAINT "spells_groupId_fkey";
ALTER TABLE "spells" DROP CONSTRAINT "spells_summonUnitId_fkey";
ALTER TABLE "units" DROP CONSTRAINT "units_raceId_fkey";
