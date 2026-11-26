CREATE TABLE "battle_map_art" (
    "mapId" TEXT NOT NULL,
    "scene" JSONB NOT NULL,
    "scene_version" INTEGER NOT NULL DEFAULT 1,
    "baked_url" TEXT,
    "baked_at" TIMESTAMP(3),
    "baked_scene_version" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battle_map_art_pkey" PRIMARY KEY ("mapId")
);

ALTER TABLE "battle_map_art" ADD CONSTRAINT "battle_map_art_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "battle_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "battle_map_art" ENABLE ROW LEVEL SECURITY;
