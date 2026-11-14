-- AlterTable
ALTER TABLE "battle_scenes" ADD COLUMN "map_id" TEXT,
ADD COLUMN "map_version" INTEGER;

-- CreateTable
CREATE TABLE "battle_maps" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cols" INTEGER NOT NULL,
    "rows" INTEGER NOT NULL,
    "header" JSONB NOT NULL,
    "map_version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "battle_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_map_chunks" (
    "mapId" TEXT NOT NULL,
    "cx" INTEGER NOT NULL,
    "cy" INTEGER NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "battle_map_chunks_pkey" PRIMARY KEY ("mapId","cx","cy")
);

-- CreateTable
CREATE TABLE "battle_map_versions" (
    "mapId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "battle_map_versions_pkey" PRIMARY KEY ("mapId","version")
);

-- CreateTable
CREATE TABLE "battle_map_state" (
    "battleId" TEXT NOT NULL,
    "removed_edges" JSONB NOT NULL DEFAULT '[]',
    "doors" JSONB NOT NULL DEFAULT '{}',
    "fog" JSONB,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battle_map_state_pkey" PRIMARY KEY ("battleId")
);

-- CreateIndex
CREATE INDEX "battle_maps_campaignId_idx" ON "battle_maps"("campaignId");

-- CreateIndex
CREATE INDEX "battle_scenes_map_id_idx" ON "battle_scenes"("map_id");

-- AddForeignKey
ALTER TABLE "battle_maps" ADD CONSTRAINT "battle_maps_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_map_chunks" ADD CONSTRAINT "battle_map_chunks_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "battle_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_map_versions" ADD CONSTRAINT "battle_map_versions_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "battle_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_map_state" ADD CONSTRAINT "battle_map_state_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battle_scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "battle_maps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battle_map_chunks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battle_map_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battle_map_state" ENABLE ROW LEVEL SECURITY;
