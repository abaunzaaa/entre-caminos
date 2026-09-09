-- AlterTable
ALTER TABLE "users" ADD COLUMN "verification_code" TEXT;
ALTER TABLE "users" ADD COLUMN "verification_code_expires" TIMESTAMP(3);
