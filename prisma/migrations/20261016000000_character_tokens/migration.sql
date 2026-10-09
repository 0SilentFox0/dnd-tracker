CREATE TABLE "character_tokens" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "character_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "character_tokens_characterId_idx" ON "character_tokens"("characterId");

ALTER TABLE "character_tokens" ADD CONSTRAINT "character_tokens_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "character_tokens" ENABLE ROW LEVEL SECURITY;
