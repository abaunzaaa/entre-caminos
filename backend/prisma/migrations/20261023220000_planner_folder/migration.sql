ALTER TABLE "planner_itineraries"
  ADD COLUMN IF NOT EXISTS "folder_key" TEXT NOT NULL DEFAULT 'descubrimientos';
