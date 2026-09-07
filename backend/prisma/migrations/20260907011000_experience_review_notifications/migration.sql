-- AlterTable
ALTER TABLE "experiences" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "experiences" ADD COLUMN "submitted_at" TIMESTAMP(3);
ALTER TABLE "experiences" ADD COLUMN "rejection_reason" TEXT;
ALTER TABLE "experiences" ADD COLUMN "reviewed_at" TIMESTAMP(3);
ALTER TABLE "experiences" ADD COLUMN "reviewed_by" TEXT;

CREATE INDEX "experiences_submitted_at_idx" ON "experiences"("submitted_at");

ALTER TABLE "experiences" ADD CONSTRAINT "experiences_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ExperienceReviewDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "experience_reviews" (
    "id" TEXT NOT NULL,
    "experience_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "decision" "ExperienceReviewDecision" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "experience_reviews_experience_id_created_at_idx" ON "experience_reviews"("experience_id", "created_at");
CREATE INDEX "experience_reviews_reviewer_id_idx" ON "experience_reviews"("reviewer_id");

ALTER TABLE "experience_reviews" ADD CONSTRAINT "experience_reviews_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "experience_reviews" ADD CONSTRAINT "experience_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "entity" TEXT,
    "entity_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed review permission for super admins
INSERT INTO "permissions" ("id", "name")
SELECT gen_random_uuid(), 'experiences.review'
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "name" = 'experiences.review');

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."name" = 'experiences.review'
WHERE r."name" = 'SUPER_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
