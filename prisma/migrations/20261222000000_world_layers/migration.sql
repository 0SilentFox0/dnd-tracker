-- AlterTable
ALTER TABLE "world_markers" ADD COLUMN "layerId" TEXT;

-- CreateTable
CREATE TABLE "world_layers" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'dm',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "imgX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imgY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imgW" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "imgH" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "opacity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "world_layers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "world_layers" ENABLE ROW LEVEL SECURITY;

-- CreateTable
CREATE TABLE "world_layer_heroes" (
    "layerId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,

    CONSTRAINT "world_layer_heroes_pkey" PRIMARY KEY ("layerId","characterId")
);

ALTER TABLE "world_layer_heroes" ENABLE ROW LEVEL SECURITY;

-- CreateIndex
CREATE INDEX "world_layers_mapId_sortOrder_idx" ON "world_layers"("mapId", "sortOrder");

-- CreateIndex
CREATE INDEX "world_markers_layerId_idx" ON "world_markers"("layerId");

-- AddForeignKey
ALTER TABLE "world_markers" ADD CONSTRAINT "world_markers_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "world_layers"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_layers" ADD CONSTRAINT "world_layers_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "world_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_layer_heroes" ADD CONSTRAINT "world_layer_heroes_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "world_layers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "world_layer_heroes" ADD CONSTRAINT "world_layer_heroes_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
