-- Admin list/dashboard filters and ownership counts
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users"("status");
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users"("created_at");
CREATE INDEX IF NOT EXISTS "categories_status_idx" ON "categories"("status");
CREATE INDEX IF NOT EXISTS "categories_created_at_idx" ON "categories"("created_at");
CREATE INDEX IF NOT EXISTS "experiences_created_by_idx" ON "experiences"("created_by");
CREATE INDEX IF NOT EXISTS "experiences_created_at_idx" ON "experiences"("created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_action_idx" ON "audit_logs"("user_id", "action");
