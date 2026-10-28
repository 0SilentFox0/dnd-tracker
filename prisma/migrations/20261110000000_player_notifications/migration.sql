-- CreateTable
CREATE TABLE "player_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "player_notifications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "player_notifications" ENABLE ROW LEVEL SECURITY;

-- CreateIndex
CREATE INDEX "player_notifications_userId_campaignId_readAt_idx" ON "player_notifications"("userId", "campaignId", "readAt");

-- CreateIndex
CREATE INDEX "player_notifications_readAt_idx" ON "player_notifications"("readAt");

-- CreateIndex
CREATE UNIQUE INDEX "player_notifications_userId_type_refId_key" ON "player_notifications"("userId", "type", "refId");

-- AddForeignKey
ALTER TABLE "player_notifications" ADD CONSTRAINT "player_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_notifications" ADD CONSTRAINT "player_notifications_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
