ALTER TABLE "campaigns" ADD COLUMN "hidden_builtin_sounds" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "campaign_sounds" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "duration_ms" INTEGER,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "color" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_sounds_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaign_sounds_campaign_id_sort_order_idx" ON "campaign_sounds"("campaign_id", "sort_order");

ALTER TABLE "campaign_sounds" ADD CONSTRAINT "campaign_sounds_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_sounds" ENABLE ROW LEVEL SECURITY;
