CREATE TABLE "sound_library_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'volume-2',
    "color" TEXT,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "url" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "source_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sound_library_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sound_presets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slots" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sound_presets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sound_library_items_user_id_created_at_idx" ON "sound_library_items"("user_id", "created_at");

CREATE INDEX "sound_presets_user_id_sort_order_idx" ON "sound_presets"("user_id", "sort_order");

ALTER TABLE "sound_library_items" ADD CONSTRAINT "sound_library_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sound_presets" ADD CONSTRAINT "sound_presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sound_library_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "sound_presets" ENABLE ROW LEVEL SECURITY;
