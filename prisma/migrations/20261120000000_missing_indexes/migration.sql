-- CreateIndex
CREATE INDEX "acquaintance_notes_authorUserId_idx" ON "acquaintance_notes"("authorUserId");

-- CreateIndex
CREATE INDEX "ai_threads_scenarioPageId_idx" ON "ai_threads"("scenarioPageId");

-- CreateIndex
CREATE INDEX "artifact_sets_campaignId_sourceId_idx" ON "artifact_sets"("campaignId", "sourceId");

-- CreateIndex
CREATE INDEX "artifacts_campaignId_sourceId_idx" ON "artifacts"("campaignId", "sourceId");

-- CreateIndex
CREATE INDEX "backgrounds_campaignId_sourceId_idx" ON "backgrounds"("campaignId", "sourceId");

-- CreateIndex
CREATE INDEX "campaign_tracks_campaignId_sourceId_idx" ON "campaign_tracks"("campaignId", "sourceId");

-- CreateIndex
CREATE INDEX "campaigns_createdFromId_idx" ON "campaigns"("createdFromId");

-- CreateIndex
CREATE INDEX "character_skills_skillTreeId_idx" ON "character_skills"("skillTreeId");

-- CreateIndex
CREATE INDEX "classes_campaignId_sourceId_idx" ON "classes"("campaignId", "sourceId");

-- CreateIndex
CREATE INDEX "feats_campaignId_sourceId_idx" ON "feats"("campaignId", "sourceId");

-- CreateIndex
CREATE INDEX "main_skills_spellGroupId_idx" ON "main_skills"("spellGroupId");

-- CreateIndex
CREATE INDEX "main_skills_campaignId_sourceId_idx" ON "main_skills"("campaignId", "sourceId");

-- CreateIndex
CREATE INDEX "player_notifications_campaignId_idx" ON "player_notifications"("campaignId");

-- CreateIndex
CREATE INDEX "races_campaignId_sourceId_idx" ON "races"("campaignId", "sourceId");

-- CreateIndex
CREATE INDEX "skill_trees_campaignId_sourceId_idx" ON "skill_trees"("campaignId", "sourceId");

-- CreateIndex
CREATE INDEX "skills_campaignId_sourceId_idx" ON "skills"("campaignId", "sourceId");

-- CreateIndex
CREATE INDEX "spell_groups_campaignId_sourceId_idx" ON "spell_groups"("campaignId", "sourceId");

-- CreateIndex
CREATE INDEX "spells_campaignId_sourceId_idx" ON "spells"("campaignId", "sourceId");

-- CreateIndex
CREATE INDEX "units_campaignId_sourceId_idx" ON "units"("campaignId", "sourceId");

-- CreateIndex
CREATE INDEX "world_notes_authorUserId_idx" ON "world_notes"("authorUserId");

-- CreateIndex
CREATE INDEX "world_notes_characterId_idx" ON "world_notes"("characterId");

-- CreateIndex
CREATE INDEX "world_positions_mapId_idx" ON "world_positions"("mapId");

-- CreateIndex
CREATE INDEX "world_reveals_characterId_idx" ON "world_reveals"("characterId");

-- CreateIndex
CREATE INDEX "world_travel_log_mapId_idx" ON "world_travel_log"("mapId");

-- CreateIndex
CREATE INDEX "world_travel_log_toMarkerId_idx" ON "world_travel_log"("toMarkerId");

-- CreateIndex
CREATE INDEX "world_travel_log_byUserId_idx" ON "world_travel_log"("byUserId");
