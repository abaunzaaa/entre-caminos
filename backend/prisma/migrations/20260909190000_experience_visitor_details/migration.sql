-- AlterTable
ALTER TABLE "experiences" ADD COLUMN "external_url" TEXT;
ALTER TABLE "experiences" ADD COLUMN "duration" TEXT;
ALTER TABLE "experiences" ADD COLUMN "availability" JSONB;
ALTER TABLE "experiences" ADD COLUMN "how_to_get_there" TEXT;
