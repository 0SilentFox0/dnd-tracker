CREATE TABLE "quests" (
 "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "title" TEXT NOT NULL,
 "description" TEXT NOT NULL DEFAULT '', "kind" TEXT NOT NULL DEFAULT 'main',
 "status" TEXT NOT NULL DEFAULT 'active', "visible" BOOLEAN NOT NULL DEFAULT false,
 "notes" TEXT NOT NULL DEFAULT '', "reward" TEXT NOT NULL DEFAULT '', "markerId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "quests_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "quests_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "quests_markerId_fkey" FOREIGN KEY ("markerId") REFERENCES "world_markers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "quest_objectives" (
 "id" TEXT NOT NULL, "questId" TEXT NOT NULL, "title" TEXT NOT NULL,
 "completed" BOOLEAN NOT NULL DEFAULT false, "visible" BOOLEAN NOT NULL DEFAULT false, "sortOrder" INTEGER NOT NULL DEFAULT 0,
 CONSTRAINT "quest_objectives_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "quest_objectives_questId_fkey" FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "quest_tracking" (
 "questId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 CONSTRAINT "quest_tracking_pkey" PRIMARY KEY ("questId", "userId"),
 CONSTRAINT "quest_tracking_questId_fkey" FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "quest_tracking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "quests_campaignId_visible_status_idx" ON "quests"("campaignId", "visible", "status");
CREATE INDEX "quests_markerId_idx" ON "quests"("markerId");
CREATE INDEX "quest_objectives_questId_sortOrder_idx" ON "quest_objectives"("questId", "sortOrder");
CREATE INDEX "quest_tracking_userId_idx" ON "quest_tracking"("userId");
ALTER TABLE "quests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quest_objectives" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quest_tracking" ENABLE ROW LEVEL SECURITY;
