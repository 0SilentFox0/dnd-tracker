-- AlterTable
ALTER TABLE "campaign_shows" ADD COLUMN     "world" JSONB;

-- CreateTable
CREATE TABLE "world_maps" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "parentMarkerId" TEXT,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fogEnabled" BOOLEAN NOT NULL DEFAULT true,
    "revealRadius" DOUBLE PRECISION NOT NULL DEFAULT 0.04,
    "entryX" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "entryY" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "world_maps_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "world_maps" ENABLE ROW LEVEL SECURITY;

-- CreateTable
CREATE TABLE "world_markers" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "polygon" JSONB,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "dmNote" TEXT,
    "alwaysVisible" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "world_markers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "world_markers" ENABLE ROW LEVEL SECURITY;

-- CreateTable
CREATE TABLE "world_positions" (
    "characterId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "world_positions_pkey" PRIMARY KEY ("characterId")
);

ALTER TABLE "world_positions" ENABLE ROW LEVEL SECURITY;

-- CreateTable
CREATE TABLE "world_reveals" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "shape" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_reveals_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "world_reveals" ENABLE ROW LEVEL SECURITY;

-- CreateTable
CREATE TABLE "world_travel_log" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "characterIds" TEXT[],
    "from" JSONB,
    "to" JSONB NOT NULL,
    "toMarkerId" TEXT,
    "rest" TEXT NOT NULL DEFAULT 'none',
    "byUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_travel_log_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "world_travel_log" ENABLE ROW LEVEL SECURITY;

-- CreateTable
CREATE TABLE "world_notes" (
    "id" TEXT NOT NULL,
    "markerId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "characterId" TEXT,
    "visibility" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "world_notes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "world_notes" ENABLE ROW LEVEL SECURITY;

-- CreateIndex
CREATE UNIQUE INDEX "world_maps_parentMarkerId_key" ON "world_maps"("parentMarkerId");

-- CreateIndex
CREATE INDEX "world_maps_campaignId_idx" ON "world_maps"("campaignId");

-- CreateIndex
CREATE INDEX "world_markers_mapId_sortOrder_idx" ON "world_markers"("mapId", "sortOrder");

-- CreateIndex
CREATE INDEX "world_positions_campaignId_idx" ON "world_positions"("campaignId");

-- CreateIndex
CREATE INDEX "world_reveals_mapId_characterId_idx" ON "world_reveals"("mapId", "characterId");

-- CreateIndex
CREATE INDEX "world_travel_log_campaignId_createdAt_idx" ON "world_travel_log"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "world_notes_markerId_idx" ON "world_notes"("markerId");

-- AddForeignKey
ALTER TABLE "world_maps" ADD CONSTRAINT "world_maps_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_maps" ADD CONSTRAINT "world_maps_parentMarkerId_fkey" FOREIGN KEY ("parentMarkerId") REFERENCES "world_markers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_markers" ADD CONSTRAINT "world_markers_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "world_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_positions" ADD CONSTRAINT "world_positions_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_positions" ADD CONSTRAINT "world_positions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_positions" ADD CONSTRAINT "world_positions_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "world_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_reveals" ADD CONSTRAINT "world_reveals_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "world_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_reveals" ADD CONSTRAINT "world_reveals_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_travel_log" ADD CONSTRAINT "world_travel_log_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_travel_log" ADD CONSTRAINT "world_travel_log_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "world_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_travel_log" ADD CONSTRAINT "world_travel_log_toMarkerId_fkey" FOREIGN KEY ("toMarkerId") REFERENCES "world_markers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_travel_log" ADD CONSTRAINT "world_travel_log_byUserId_fkey" FOREIGN KEY ("byUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_notes" ADD CONSTRAINT "world_notes_markerId_fkey" FOREIGN KEY ("markerId") REFERENCES "world_markers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_notes" ADD CONSTRAINT "world_notes_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_notes" ADD CONSTRAINT "world_notes_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
