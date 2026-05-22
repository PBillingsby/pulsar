-- CreateTable
CREATE TABLE "WeeklySnapshot" (
    "id" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "totalVisitors" INTEGER NOT NULL,
    "returning" INTEGER NOT NULL,
    "comebackRate" DOUBLE PRECISION,
    "topPage" TEXT,
    "totalEvents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklySnapshot_projectKey_idx" ON "WeeklySnapshot"("projectKey");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklySnapshot_projectKey_weekStart_key" ON "WeeklySnapshot"("projectKey", "weekStart");
