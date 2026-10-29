-- CreateIndex
CREATE INDEX "ai_proposals_campaignId_idx" ON "ai_proposals"("campaignId");

-- CreateIndex
CREATE INDEX "ai_proposals_threadId_idx" ON "ai_proposals"("threadId");

-- CreateIndex
CREATE INDEX "artifacts_setId_idx" ON "artifacts"("setId");

-- CreateIndex
CREATE INDEX "character_logs_campaignId_idx" ON "character_logs"("campaignId");

-- CreateIndex
CREATE INDEX "inventory_log_campaignId_idx" ON "inventory_log"("campaignId");

-- CreateIndex
CREATE INDEX "skills_mainSkillId_idx" ON "skills"("mainSkillId");

-- CreateIndex
CREATE INDEX "skills_spellGroupId_idx" ON "skills"("spellGroupId");

-- CreateIndex
CREATE INDEX "skills_spellId_idx" ON "skills"("spellId");

-- CreateIndex
CREATE INDEX "skills_grantedSpellId_idx" ON "skills"("grantedSpellId");

-- CreateIndex
CREATE INDEX "skills_spellNewSpellId_idx" ON "skills"("spellNewSpellId");

-- CreateIndex
CREATE INDEX "spells_groupId_idx" ON "spells"("groupId");

-- CreateIndex
CREATE INDEX "spells_summonUnitId_idx" ON "spells"("summonUnitId");

