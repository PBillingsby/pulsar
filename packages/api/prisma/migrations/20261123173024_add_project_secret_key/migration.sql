-- Private key per project, used to authenticate stats and digest requests.
ALTER TABLE "Project" ADD COLUMN "secretKey" TEXT;

-- Backfill existing projects with a random 64-char hex key
UPDATE "Project"
SET "secretKey" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE "secretKey" IS NULL;

ALTER TABLE "Project" ALTER COLUMN "secretKey" SET NOT NULL;

CREATE UNIQUE INDEX "Project_secretKey_key" ON "Project"("secretKey");