-- AlterTable
ALTER TABLE "WeeklySnapshot" ADD COLUMN     "avgSessionDurationBouncers" DOUBLE PRECISION,
ADD COLUMN     "avgSessionDurationReturners" DOUBLE PRECISION,
ADD COLUMN     "formSubmissionRate" DOUBLE PRECISION,
ADD COLUMN     "rageClickCount" INTEGER;
