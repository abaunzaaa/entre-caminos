-- AlterTable
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "favorite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "folder_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "conversations_user_id_favorite_idx" ON "conversations"("user_id", "favorite");
