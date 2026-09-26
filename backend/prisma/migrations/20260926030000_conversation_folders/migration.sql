-- CreateTable
CREATE TABLE IF NOT EXISTS "folders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT DEFAULT 'folder',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "folders_user_id_created_at_idx" ON "folders"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "folders" DROP CONSTRAINT IF EXISTS "folders_user_id_fkey";
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Loose folder ids that are not UUIDs cannot become a foreign key.
UPDATE "conversations"
SET "folder_id" = NULL
WHERE "folder_id" IS NOT NULL
  AND "folder_id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE "conversations" c
SET "folder_id" = NULL
WHERE c."folder_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "folders" f WHERE f."id" = c."folder_id");

CREATE INDEX IF NOT EXISTS "conversations_folder_id_idx" ON "conversations"("folder_id");

ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_folder_id_fkey";
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
