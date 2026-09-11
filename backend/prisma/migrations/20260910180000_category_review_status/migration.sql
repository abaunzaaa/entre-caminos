ALTER TYPE "CategoryStatus" RENAME TO "CategoryStatus_old";

CREATE TYPE "CategoryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "categories" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "categories"
  ALTER COLUMN "status" TYPE "CategoryStatus"
  USING (
    CASE
      WHEN "status"::text = 'ACTIVE' THEN 'APPROVED'::"CategoryStatus"
      ELSE 'REJECTED'::"CategoryStatus"
    END
  );

ALTER TABLE "categories" ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "CategoryStatus_old";

ALTER TABLE "categories" ADD COLUMN "rejection_reason" TEXT;
ALTER TABLE "categories" ADD COLUMN "reviewed_at" TIMESTAMP(3);
ALTER TABLE "categories" ADD COLUMN "reviewed_by" TEXT;

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_reviewed_by_fkey"
  FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "categories_reviewed_by_idx" ON "categories"("reviewed_by");
