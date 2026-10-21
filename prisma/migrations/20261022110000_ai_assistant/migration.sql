-- CreateTable
CREATE TABLE "ai_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "last4" TEXT NOT NULL,
    "defaultModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_credentials_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ai_credentials" ENABLE ROW LEVEL SECURITY;

-- CreateTable
CREATE TABLE "ai_threads" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "scenarioPageId" TEXT,
    "title" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_threads_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ai_threads" ENABLE ROW LEVEL SECURITY;

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "parts" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ai_messages" ENABLE ROW LEVEL SECURITY;

-- CreateTable
CREATE TABLE "ai_proposals" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "threadId" TEXT,
    "pageId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "ops" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "appliedVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_proposals_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ai_proposals" ENABLE ROW LEVEL SECURITY;

-- CreateTable
CREATE TABLE "api_tokens" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "api_tokens" ENABLE ROW LEVEL SECURITY;

-- CreateIndex
CREATE UNIQUE INDEX "ai_credentials_userId_provider_key" ON "ai_credentials"("userId", "provider");

-- CreateIndex
CREATE INDEX "ai_threads_campaignId_userId_updatedAt_idx" ON "ai_threads"("campaignId", "userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_messages_threadId_seq_key" ON "ai_messages"("threadId", "seq");

-- CreateIndex
CREATE INDEX "ai_proposals_pageId_status_idx" ON "ai_proposals"("pageId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_tokenHash_key" ON "api_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "api_tokens_campaignId_idx" ON "api_tokens"("campaignId");

-- AddForeignKey
ALTER TABLE "ai_credentials" ADD CONSTRAINT "ai_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_threads" ADD CONSTRAINT "ai_threads_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_threads" ADD CONSTRAINT "ai_threads_scenarioPageId_fkey" FOREIGN KEY ("scenarioPageId") REFERENCES "scenario_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ai_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_proposals" ADD CONSTRAINT "ai_proposals_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_proposals" ADD CONSTRAINT "ai_proposals_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ai_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_proposals" ADD CONSTRAINT "ai_proposals_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "scenario_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
