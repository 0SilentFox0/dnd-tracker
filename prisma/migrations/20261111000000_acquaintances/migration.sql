-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "acquaintancesEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "acquaintances" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "characterId" TEXT,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "sourcePageId" TEXT NOT NULL,
    "sourceSectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acquaintances_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "acquaintances" ENABLE ROW LEVEL SECURITY;

-- CreateTable
CREATE TABLE "acquaintance_entries" (
    "id" TEXT NOT NULL,
    "acquaintanceId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acquaintance_entries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "acquaintance_entries" ENABLE ROW LEVEL SECURITY;

-- CreateTable
CREATE TABLE "acquaintance_notes" (
    "id" TEXT NOT NULL,
    "acquaintanceId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acquaintance_notes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "acquaintance_notes" ENABLE ROW LEVEL SECURITY;

-- CreateIndex
CREATE INDEX "acquaintances_campaignId_sourcePageId_idx" ON "acquaintances"("campaignId", "sourcePageId");

-- CreateIndex
CREATE INDEX "acquaintances_characterId_idx" ON "acquaintances"("characterId");

-- CreateIndex
CREATE INDEX "acquaintance_entries_acquaintanceId_idx" ON "acquaintance_entries"("acquaintanceId");

-- CreateIndex
CREATE INDEX "acquaintance_entries_pageId_idx" ON "acquaintance_entries"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "acquaintance_notes_acquaintanceId_authorUserId_key" ON "acquaintance_notes"("acquaintanceId", "authorUserId");

-- AddForeignKey
ALTER TABLE "acquaintances" ADD CONSTRAINT "acquaintances_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acquaintances" ADD CONSTRAINT "acquaintances_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acquaintance_entries" ADD CONSTRAINT "acquaintance_entries_acquaintanceId_fkey" FOREIGN KEY ("acquaintanceId") REFERENCES "acquaintances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acquaintance_notes" ADD CONSTRAINT "acquaintance_notes_acquaintanceId_fkey" FOREIGN KEY ("acquaintanceId") REFERENCES "acquaintances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acquaintance_notes" ADD CONSTRAINT "acquaintance_notes_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
