-- CreateTable
CREATE TABLE "user_onboarding_flags" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_onboarding_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_onboarding_flags_userId_key_key" ON "user_onboarding_flags"("userId", "key");

-- AddForeignKey
ALTER TABLE "user_onboarding_flags" ADD CONSTRAINT "user_onboarding_flags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_onboarding_flags" ENABLE ROW LEVEL SECURITY;
