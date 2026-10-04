-- AlterTable
ALTER TABLE "battle_scenes" ADD COLUMN     "eventSeq" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "battle_participants" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "controlledBy" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "isPending" BOOLEAN NOT NULL DEFAULT false,
    "extraTurnOf" TEXT,
    "currentHp" INTEGER NOT NULL,
    "tempHp" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "morale" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "initiative" INTEGER NOT NULL,
    "hasUsedAction" BOOLEAN NOT NULL,
    "hasUsedBonusAction" BOOLEAN NOT NULL,
    "hasUsedReaction" BOOLEAN NOT NULL,
    "hasExtraTurn" BOOLEAN NOT NULL,
    "snapshot" JSONB NOT NULL,
    "state" JSONB NOT NULL,
    "snapshotHash" TEXT NOT NULL,

    CONSTRAINT "battle_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_events" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "targets" JSONB NOT NULL DEFAULT '[]',
    "details" JSONB NOT NULL DEFAULT '{}',
    "hpChanges" JSONB NOT NULL DEFAULT '[]',
    "resultText" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_snapshots" (
    "battleId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "state" JSONB NOT NULL,

    CONSTRAINT "battle_snapshots_pkey" PRIMARY KEY ("battleId","seq")
);

-- CreateIndex
CREATE INDEX "battle_participants_battleId_orderIndex_idx" ON "battle_participants"("battleId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "battle_events_battleId_seq_key" ON "battle_events"("battleId", "seq");

-- AddForeignKey
ALTER TABLE "battle_participants" ADD CONSTRAINT "battle_participants_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battle_scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_events" ADD CONSTRAINT "battle_events_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battle_scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_snapshots" ADD CONSTRAINT "battle_snapshots_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battle_scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS: Supabase Data API (anon key) не має бачити дані бою
ALTER TABLE "battle_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battle_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battle_snapshots" ENABLE ROW LEVEL SECURITY;
