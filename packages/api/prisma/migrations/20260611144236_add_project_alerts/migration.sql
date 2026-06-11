-- CreateTable
CREATE TABLE "ProjectAlert" (
    "id" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectAlert_projectKey_type_sentAt_idx" ON "ProjectAlert"("projectKey", "type", "sentAt");
