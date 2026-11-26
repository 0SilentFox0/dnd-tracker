-- CreateTable
CREATE TABLE "user_access" (
    "userId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "country" TEXT,
    "device" TEXT,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "days" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "user_access_pkey" PRIMARY KEY ("userId","ip")
);

-- CreateTable
CREATE TABLE "user_activity_days" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,

    CONSTRAINT "user_activity_days_pkey" PRIMARY KEY ("userId","day")
);

-- CreateTable
CREATE TABLE "account_deletions" (
    "id" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "by" TEXT NOT NULL,
    "accountAgeDays" INTEGER NOT NULL,
    "campaigns" INTEGER NOT NULL,
    "emailHash" TEXT,

    CONSTRAINT "account_deletions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_access_ip_idx" ON "user_access"("ip");

-- CreateIndex
CREATE INDEX "user_access_lastSeen_idx" ON "user_access"("lastSeen");

-- CreateIndex
CREATE INDEX "user_activity_days_day_idx" ON "user_activity_days"("day");

-- CreateIndex
CREATE INDEX "account_deletions_deletedAt_idx" ON "account_deletions"("deletedAt");

-- CreateIndex
CREATE INDEX "account_deletions_emailHash_idx" ON "account_deletions"("emailHash");

-- CreateIndex
CREATE INDEX "admin_actions_targetUserId_at_idx" ON "admin_actions"("targetUserId", "at");

-- CreateIndex
CREATE INDEX "admin_actions_at_idx" ON "admin_actions"("at");

-- AddForeignKey
ALTER TABLE "user_access" ADD CONSTRAINT "user_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activity_days" ADD CONSTRAINT "user_activity_days_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_access" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "user_activity_days" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "account_deletions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "admin_actions" ENABLE ROW LEVEL SECURITY;
