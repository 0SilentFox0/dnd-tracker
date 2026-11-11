-- CreateTable
CREATE TABLE "careers" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "class" TEXT,
    "tiers" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "careers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "careers_campaignId_idx" ON "careers"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "careers_campaignId_name_key" ON "careers"("campaignId", "name");

-- AddForeignKey
ALTER TABLE "careers" ADD CONSTRAINT "careers_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- EnableRowLevelSecurity
ALTER TABLE "careers" ENABLE ROW LEVEL SECURITY;
