-- CreateTable
CREATE TABLE "ProjectDeletionToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDeletionToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDeletionToken_token_key" ON "ProjectDeletionToken"("token");

-- CreateIndex
CREATE INDEX "ProjectDeletionToken_projectKey_idx" ON "ProjectDeletionToken"("projectKey");

-- CreateIndex
CREATE INDEX "ProjectDeletionToken_email_idx" ON "ProjectDeletionToken"("email");
