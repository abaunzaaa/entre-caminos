ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "conversations_user_id_pinned_idx" ON "conversations"("user_id", "pinned");
