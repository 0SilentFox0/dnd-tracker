-- CreateIndex
CREATE INDEX "characters_campaignId_idx" ON "characters"("campaignId");

-- CreateIndex
CREATE INDEX "units_campaignId_idx" ON "units"("campaignId");

-- CreateIndex
CREATE INDEX "skill_trees_campaignId_race_idx" ON "skill_trees"("campaignId", "race");

-- CreateIndex
CREATE INDEX "battle_scenes_campaignId_idx" ON "battle_scenes"("campaignId");

-- CreateIndex
CREATE INDEX "spells_campaignId_idx" ON "spells"("campaignId");

-- CreateIndex
CREATE INDEX "artifacts_campaignId_idx" ON "artifacts"("campaignId");

-- CreateIndex
CREATE INDEX "skills_campaignId_idx" ON "skills"("campaignId");

-- CreateIndex
CREATE INDEX "skills_campaignId_id_idx" ON "skills"("campaignId", "id");

-- CreateIndex
CREATE INDEX "races_campaignId_name_idx" ON "races"("campaignId", "name");

-- CreateIndex
CREATE INDEX "main_skills_campaignId_idx" ON "main_skills"("campaignId");
