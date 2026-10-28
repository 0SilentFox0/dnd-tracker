-- AlterTable
ALTER TABLE "ai_threads" ADD COLUMN     "executionMode" TEXT NOT NULL DEFAULT 'review';

-- AlterTable
ALTER TABLE "api_tokens" ADD COLUMN     "executionMode" TEXT NOT NULL DEFAULT 'review';

-- CreateTable
CREATE TABLE "assistant_intents" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "threadId" TEXT,
    "tokenId" TEXT,
    "originThreadId" TEXT,
    "originTokenId" TEXT,
    "originKey" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "targets" JSONB NOT NULL DEFAULT '[]',
    "payload" JSONB NOT NULL,
    "preview" JSONB NOT NULL,
    "expected" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redactedAt" TIMESTAMP(3),
    "legacyProposalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_receipts" (
    "id" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originTokenId" TEXT,
    "originKey" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "effects" JSONB NOT NULL DEFAULT '[]',
    "effectsStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_runs" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "activeThreadId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "abortRequested" BOOLEAN NOT NULL DEFAULT false,
    "resultRefs" JSONB NOT NULL DEFAULT '[]',
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assistant_intents_legacyProposalId_key" ON "assistant_intents"("legacyProposalId");

-- CreateIndex
CREATE INDEX "assistant_intents_campaignId_userId_status_createdAt_id_idx" ON "assistant_intents"("campaignId", "userId", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "assistant_intents_threadId_idx" ON "assistant_intents"("threadId");

-- CreateIndex
CREATE INDEX "assistant_intents_tokenId_idx" ON "assistant_intents"("tokenId");

-- CreateIndex
CREATE INDEX "assistant_intents_status_updatedAt_idx" ON "assistant_intents"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_intents_userId_originKey_requestId_key" ON "assistant_intents"("userId", "originKey", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_receipts_intentId_key" ON "assistant_receipts"("intentId");

-- CreateIndex
CREATE INDEX "assistant_receipts_campaignId_userId_createdAt_idx" ON "assistant_receipts"("campaignId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "assistant_receipts_status_effectsStatus_updatedAt_idx" ON "assistant_receipts"("status", "effectsStatus", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_receipts_userId_originKey_requestId_key" ON "assistant_receipts"("userId", "originKey", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_runs_activeThreadId_key" ON "assistant_runs"("activeThreadId");

-- CreateIndex
CREATE INDEX "assistant_runs_status_expiresAt_idx" ON "assistant_runs"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_runs_threadId_requestId_key" ON "assistant_runs"("threadId", "requestId");

-- AddForeignKey
ALTER TABLE "assistant_intents" ADD CONSTRAINT "assistant_intents_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_intents" ADD CONSTRAINT "assistant_intents_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ai_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_intents" ADD CONSTRAINT "assistant_intents_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "api_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_runs" ADD CONSTRAINT "assistant_runs_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ai_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Access remains through the existing authenticated server services only.
ALTER TABLE "assistant_intents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assistant_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assistant_runs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "ai_threads" ADD CONSTRAINT "ai_threads_executionMode_check" CHECK ("executionMode" IN ('review', 'auto'));
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_executionMode_check" CHECK ("executionMode" IN ('review', 'auto'));
ALTER TABLE "assistant_intents" ADD CONSTRAINT "assistant_intents_status_check" CHECK ("status" IN ('pending', 'executing', 'applied', 'rejected', 'stale', 'expired', 'failed', 'unknown'));
ALTER TABLE "assistant_intents" ADD CONSTRAINT "assistant_intents_channel_check" CHECK ("channel" IN ('chat', 'mcp'));
ALTER TABLE "assistant_intents" ADD CONSTRAINT "assistant_intents_origin_check" CHECK (("channel" = 'chat' AND "originTokenId" IS NULL) OR ("channel" = 'mcp' AND "originTokenId" IS NOT NULL));
ALTER TABLE "assistant_receipts" ADD CONSTRAINT "assistant_receipts_status_check" CHECK ("status" IN ('executing', 'applied', 'rejected', 'stale', 'expired', 'failed', 'unknown'));
ALTER TABLE "assistant_receipts" ADD CONSTRAINT "assistant_receipts_effectsStatus_check" CHECK ("effectsStatus" IN ('pending', 'complete', 'failed', 'unknown'));
ALTER TABLE "assistant_runs" ADD CONSTRAINT "assistant_runs_status_check" CHECK ("status" IN ('running', 'complete', 'failed', 'aborted', 'unknown'));
ALTER TABLE "assistant_runs" ADD CONSTRAINT "assistant_runs_active_check" CHECK (("status" = 'running' AND "activeThreadId" IS NOT NULL AND "activeThreadId" = "threadId") OR ("status" <> 'running' AND "activeThreadId" IS NULL));

