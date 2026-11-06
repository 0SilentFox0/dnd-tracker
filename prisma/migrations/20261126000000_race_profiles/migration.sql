-- CreateTable
CREATE TABLE "race_profiles" (
    "raceId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "profile" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "race_profiles_pkey" PRIMARY KEY ("raceId")
);

-- CreateIndex
CREATE INDEX "race_profiles_campaignId_idx" ON "race_profiles"("campaignId");

-- AddForeignKey
ALTER TABLE "race_profiles" ADD CONSTRAINT "race_profiles_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EnableRowLevelSecurity
ALTER TABLE "race_profiles" ENABLE ROW LEVEL SECURITY;
