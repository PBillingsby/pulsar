/*
  Warnings:

  - A unique constraint covering the columns `[domain]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "digestDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "digestHour" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "domain" TEXT,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'English';

-- CreateIndex
CREATE UNIQUE INDEX "Project_domain_key" ON "Project"("domain");

-- CreateIndex
CREATE INDEX "Project_digestDay_digestHour_idx" ON "Project"("digestDay", "digestHour");
