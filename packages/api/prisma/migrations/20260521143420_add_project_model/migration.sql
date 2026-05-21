-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "beta" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectKey_key" ON "Project"("projectKey");

-- CreateIndex
CREATE INDEX "Project_projectKey_idx" ON "Project"("projectKey");

-- CreateIndex
CREATE INDEX "Project_email_idx" ON "Project"("email");
