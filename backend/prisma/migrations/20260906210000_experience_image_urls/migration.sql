-- AlterTable
ALTER TABLE "experiences" ADD COLUMN "image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "experiences"
SET "image_urls" = ARRAY["image_url"]
WHERE "image_url" IS NOT NULL AND btrim("image_url") <> '';
