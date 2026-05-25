-- CreateTable
CREATE TABLE "DigestFailure" (
    "id" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigestFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DigestFailure_projectKey_idx" ON "DigestFailure"("projectKey");

-- CreateIndex
CREATE INDEX "DigestFailure_resolved_idx" ON "DigestFailure"("resolved");
