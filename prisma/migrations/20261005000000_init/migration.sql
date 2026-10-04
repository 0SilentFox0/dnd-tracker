-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inviteCode" TEXT NOT NULL,
    "dmUserId" TEXT NOT NULL,
    "maxLevel" INTEGER NOT NULL DEFAULT 20,
    "xpMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "allowPlayerEdit" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "friendlyFire" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_members" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "controlledBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "class" TEXT NOT NULL,
    "subclass" TEXT,
    "race" TEXT NOT NULL,
    "subrace" TEXT,
    "alignment" TEXT,
    "background" TEXT,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "avatar" TEXT,
    "strength" INTEGER NOT NULL DEFAULT 10,
    "dexterity" INTEGER NOT NULL DEFAULT 10,
    "constitution" INTEGER NOT NULL DEFAULT 10,
    "intelligence" INTEGER NOT NULL DEFAULT 10,
    "wisdom" INTEGER NOT NULL DEFAULT 10,
    "charisma" INTEGER NOT NULL DEFAULT 10,
    "armorClass" INTEGER NOT NULL DEFAULT 10,
    "initiative" INTEGER NOT NULL DEFAULT 0,
    "speed" INTEGER NOT NULL DEFAULT 30,
    "maxHp" INTEGER NOT NULL DEFAULT 10,
    "currentHp" INTEGER NOT NULL DEFAULT 10,
    "tempHp" INTEGER NOT NULL DEFAULT 0,
    "hitDice" TEXT NOT NULL DEFAULT '1d8',
    "proficiencyBonus" INTEGER NOT NULL DEFAULT 2,
    "savingThrows" JSONB NOT NULL DEFAULT '{}',
    "skills" JSONB NOT NULL DEFAULT '{}',
    "passivePerception" INTEGER NOT NULL DEFAULT 10,
    "passiveInvestigation" INTEGER NOT NULL DEFAULT 10,
    "passiveInsight" INTEGER NOT NULL DEFAULT 10,
    "spellcastingClass" TEXT,
    "spellcastingAbility" TEXT,
    "spellSaveDC" INTEGER,
    "spellAttackBonus" INTEGER,
    "spellSlots" JSONB NOT NULL DEFAULT '{}',
    "knownSpells" JSONB NOT NULL DEFAULT '[]',
    "languages" JSONB NOT NULL DEFAULT '[]',
    "proficiencies" JSONB NOT NULL DEFAULT '{}',
    "personalityTraits" TEXT,
    "ideals" TEXT,
    "bonds" TEXT,
    "flaws" TEXT,
    "skillTreeProgress" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "immunities" JSONB NOT NULL DEFAULT '[]',
    "morale" INTEGER NOT NULL DEFAULT 0,
    "maxTargets" INTEGER NOT NULL DEFAULT 1,
    "minTargets" INTEGER NOT NULL DEFAULT 1,
    "personalSkillId" TEXT,
    "hpMultiplier" DOUBLE PRECISION,
    "meleeMultiplier" DOUBLE PRECISION,
    "rangedMultiplier" DOUBLE PRECISION,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupId" TEXT,
    "groupColor" TEXT,
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
    "maxHp" INTEGER NOT NULL DEFAULT 10,
    "proficiencyBonus" INTEGER NOT NULL DEFAULT 2,
    "attacks" JSONB NOT NULL DEFAULT '[]',
    "specialAbilities" JSONB NOT NULL DEFAULT '[]',
    "knownSpells" JSONB NOT NULL DEFAULT '[]',
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "damageModifier" TEXT,
    "immunities" JSONB NOT NULL DEFAULT '[]',
    "race" TEXT,
    "morale" INTEGER NOT NULL DEFAULT 0,
    "maxTargets" INTEGER NOT NULL DEFAULT 1,
    "minTargets" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_groups" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "damageModifier" TEXT,

    CONSTRAINT "unit_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spells" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "damageType" TEXT NOT NULL,
    "castingTime" TEXT,
    "range" TEXT,
    "components" TEXT,
    "duration" TEXT,
    "concentration" BOOLEAN NOT NULL DEFAULT false,
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
    "damageDistribution" JSONB,
    "summonUnitId" TEXT,

    CONSTRAINT "spells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spell_groups" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spell_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifacts" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rarity" TEXT,
    "slot" TEXT NOT NULL,
    "bonuses" JSONB NOT NULL DEFAULT '{}',
    "modifiers" JSONB NOT NULL DEFAULT '[]',
    "passiveAbility" JSONB,
    "setId" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifact_sets" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "artifactIds" JSONB NOT NULL DEFAULT '[]',
    "setBonus" JSONB,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifact_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_inventories" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "equipped" JSONB NOT NULL DEFAULT '{}',
    "backpack" JSONB NOT NULL DEFAULT '[]',
    "gold" INTEGER NOT NULL DEFAULT 0,
    "silver" INTEGER NOT NULL DEFAULT 0,
    "copper" INTEGER NOT NULL DEFAULT 0,
    "items" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_trees" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_trees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_skills" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "skillTreeId" TEXT NOT NULL,
    "unlockedSkills" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_scenes" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'prepared',
    "participants" JSONB NOT NULL DEFAULT '[]',
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "currentTurnIndex" INTEGER NOT NULL DEFAULT 0,
    "initiativeOrder" JSONB NOT NULL DEFAULT '[]',
    "pendingSummons" JSONB NOT NULL DEFAULT '[]',
    "pendingMoraleCheck" JSONB,
    "battleLog" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "battle_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_effects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "condition" TEXT,
    "description" TEXT NOT NULL,
    "effects" JSONB NOT NULL DEFAULT '[]',
    "icon" TEXT,
    "color" TEXT,

    CONSTRAINT "status_effects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "racial_abilities" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "trigger" JSONB,
    "effect" JSONB NOT NULL,
    "appliesTo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "racial_abilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "bonuses" JSONB NOT NULL DEFAULT '{}',
    "damage" INTEGER,
    "armor" INTEGER,
    "speed" INTEGER,
    "physicalResistance" INTEGER,
    "magicalResistance" INTEGER,
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
    "skillTriggers" JSONB NOT NULL DEFAULT '[]',
    "basicInfo" JSONB NOT NULL DEFAULT '{}',
    "combatStats" JSONB NOT NULL DEFAULT '{}',
    "mainSkillData" JSONB NOT NULL DEFAULT '{}',
    "spellData" JSONB NOT NULL DEFAULT '{}',
    "spellEnhancementData" JSONB NOT NULL DEFAULT '{}',
    "appearanceDescription" TEXT,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "races" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "availableSkills" JSONB NOT NULL DEFAULT '[]',
    "disabledSkills" JSONB NOT NULL DEFAULT '[]',
    "passiveAbility" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "spellSlotProgression" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "races_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main_skills" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT,
    "isEnableInSkillTree" BOOLEAN NOT NULL DEFAULT false,
    "spellGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "main_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_inviteCode_key" ON "campaigns"("inviteCode");

-- CreateIndex
CREATE INDEX "campaigns_dmUserId_idx" ON "campaigns"("dmUserId");

-- CreateIndex
CREATE INDEX "campaign_members_userId_idx" ON "campaign_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_members_campaignId_userId_key" ON "campaign_members"("campaignId", "userId");

-- CreateIndex
CREATE INDEX "characters_campaignId_idx" ON "characters"("campaignId");

-- CreateIndex
CREATE INDEX "characters_controlledBy_idx" ON "characters"("controlledBy");

-- CreateIndex
CREATE INDEX "units_campaignId_idx" ON "units"("campaignId");

-- CreateIndex
CREATE INDEX "unit_groups_campaignId_idx" ON "unit_groups"("campaignId");

-- CreateIndex
CREATE INDEX "spells_campaignId_idx" ON "spells"("campaignId");

-- CreateIndex
CREATE INDEX "spell_groups_campaignId_idx" ON "spell_groups"("campaignId");

-- CreateIndex
CREATE INDEX "artifacts_campaignId_idx" ON "artifacts"("campaignId");

-- CreateIndex
CREATE INDEX "artifact_sets_campaignId_idx" ON "artifact_sets"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "character_inventories_characterId_key" ON "character_inventories"("characterId");

-- CreateIndex
CREATE INDEX "skill_trees_campaignId_race_idx" ON "skill_trees"("campaignId", "race");

-- CreateIndex
CREATE UNIQUE INDEX "character_skills_characterId_skillTreeId_key" ON "character_skills"("characterId", "skillTreeId");

-- CreateIndex
CREATE INDEX "battle_scenes_campaignId_idx" ON "battle_scenes"("campaignId");

-- CreateIndex
CREATE INDEX "racial_abilities_campaignId_idx" ON "racial_abilities"("campaignId");

-- CreateIndex
CREATE INDEX "skills_campaignId_idx" ON "skills"("campaignId");

-- CreateIndex
CREATE INDEX "skills_campaignId_id_idx" ON "skills"("campaignId", "id");

-- CreateIndex
CREATE INDEX "races_campaignId_name_idx" ON "races"("campaignId", "name");

-- CreateIndex
CREATE INDEX "main_skills_campaignId_idx" ON "main_skills"("campaignId");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_dmUserId_fkey" FOREIGN KEY ("dmUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_controlledBy_fkey" FOREIGN KEY ("controlledBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "unit_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_groups" ADD CONSTRAINT "unit_groups_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spells" ADD CONSTRAINT "spells_summonUnitId_fkey" FOREIGN KEY ("summonUnitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spells" ADD CONSTRAINT "spells_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spells" ADD CONSTRAINT "spells_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "spell_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spell_groups" ADD CONSTRAINT "spell_groups_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_setId_fkey" FOREIGN KEY ("setId") REFERENCES "artifact_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_sets" ADD CONSTRAINT "artifact_sets_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_inventories" ADD CONSTRAINT "character_inventories_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_trees" ADD CONSTRAINT "skill_trees_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_skills" ADD CONSTRAINT "character_skills_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_skills" ADD CONSTRAINT "character_skills_skillTreeId_fkey" FOREIGN KEY ("skillTreeId") REFERENCES "skill_trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_scenes" ADD CONSTRAINT "battle_scenes_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "racial_abilities" ADD CONSTRAINT "racial_abilities_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_mainSkillId_fkey" FOREIGN KEY ("mainSkillId") REFERENCES "main_skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_spellGroupId_fkey" FOREIGN KEY ("spellGroupId") REFERENCES "spell_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "spells"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_spellNewSpellId_fkey" FOREIGN KEY ("spellNewSpellId") REFERENCES "spells"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_grantedSpellId_fkey" FOREIGN KEY ("grantedSpellId") REFERENCES "spells"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "races" ADD CONSTRAINT "races_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_skills" ADD CONSTRAINT "main_skills_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_skills" ADD CONSTRAINT "main_skills_spellGroupId_fkey" FOREIGN KEY ("spellGroupId") REFERENCES "spell_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- RLS: доступ через Supabase Data API (anon key) закритий; Prisma і service_role RLS не обмежує.
-- shadow DB (migrate dev / diff) не має _prisma_migrations
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "characters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "unit_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "spells" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "spell_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "artifacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "artifact_sets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "character_inventories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skill_trees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "character_skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battle_scenes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "status_effects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "racial_abilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "races" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "main_skills" ENABLE ROW LEVEL SECURITY;
