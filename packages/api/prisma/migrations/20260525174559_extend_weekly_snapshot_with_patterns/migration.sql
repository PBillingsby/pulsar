-- AlterTable
ALTER TABLE "WeeklySnapshot" ADD COLUMN     "activationPage" TEXT,
ADD COLUMN     "avgDepthBouncers" DOUBLE PRECISION,
ADD COLUMN     "avgDepthReturners" DOUBLE PRECISION,
ADD COLUMN     "bouncerTopPage" TEXT,
ADD COLUMN     "returnerFirstPage" TEXT,
ADD COLUMN     "returnerTopPage" TEXT;
