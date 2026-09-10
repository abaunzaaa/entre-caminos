-- CreateEnum
CREATE TYPE "DurationUnit" AS ENUM ('MINUTES', 'HOURS', 'DAYS');

-- AlterTable
ALTER TABLE "experiences" ADD COLUMN "duration_value" INTEGER;
ALTER TABLE "experiences" ADD COLUMN "duration_unit" "DurationUnit";
