-- CreateTable
CREATE TABLE "world_sessions" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_sessions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "world_sessions" ENABLE ROW LEVEL SECURITY;

-- CreateTable
CREATE TABLE "world_enemy_pins" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "dmNote" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "world_enemy_pins_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "world_enemy_pins" ENABLE ROW LEVEL SECURITY;

-- AlterTable
ALTER TABLE "world_travel_log" ADD COLUMN "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "world_sessions_campaignId_startedAt_idx" ON "world_sessions"("campaignId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "world_sessions_one_active" ON "world_sessions"("campaignId") WHERE "endedAt" IS NULL;

-- CreateIndex
CREATE INDEX "world_enemy_pins_mapId_idx" ON "world_enemy_pins"("mapId");

-- CreateIndex
CREATE INDEX "world_travel_log_sessionId_idx" ON "world_travel_log"("sessionId");

-- AddForeignKey
ALTER TABLE "world_sessions" ADD CONSTRAINT "world_sessions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_enemy_pins" ADD CONSTRAINT "world_enemy_pins_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "world_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_travel_log" ADD CONSTRAINT "world_travel_log_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "world_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
