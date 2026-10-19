-- Preguntas frecuentes. Aditivo: no modifica tablas existentes.

CREATE TYPE "FaqStatus" AS ENUM ('PENDING', 'ANSWERED', 'PUBLISHED', 'HIDDEN', 'DISCARDED');

CREATE TYPE "FaqSource" AS ENUM ('USER_SUBMISSION', 'ADMIN_CREATED');

CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "status" "FaqStatus" NOT NULL DEFAULT 'PENDING',
    "source" "FaqSource" NOT NULL,
    "user_id" TEXT,
    "reviewed_by_id" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "faqs_status_published_at_idx" ON "faqs"("status", "published_at");

CREATE INDEX "faqs_created_at_idx" ON "faqs"("created_at");

CREATE INDEX "faqs_source_idx" ON "faqs"("source");

CREATE INDEX "faqs_user_id_idx" ON "faqs"("user_id");

ALTER TABLE "faqs" ADD CONSTRAINT "faqs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "faqs" ADD CONSTRAINT "faqs_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
