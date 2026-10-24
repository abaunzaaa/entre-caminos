-- Crea el itinerario si aún no existe y agrega las columnas del recorrido enriquecido.

CREATE TABLE IF NOT EXISTS "planner_itineraries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "why" TEXT NOT NULL DEFAULT '',
    "planned_on" DATE NOT NULL,
    "municipality" TEXT NOT NULL,
    "people" INTEGER NOT NULL,
    "duration_key" TEXT NOT NULL,
    "budget_cop" INTEGER NOT NULL,
    "plan_type" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "schedule_label" TEXT NOT NULL DEFAULT '',
    "cost_notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "planner_itineraries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "planner_stops" (
    "id" TEXT NOT NULL,
    "itinerary_id" TEXT NOT NULL,
    "experience_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "suggested_at" TEXT NOT NULL DEFAULT '',
    "suggested_end" TEXT NOT NULL DEFAULT '',
    "blurb" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "stop_type" TEXT NOT NULL DEFAULT 'experience',
    "included" BOOLEAN NOT NULL DEFAULT true,
    "additional_cost" TEXT NOT NULL DEFAULT '',
    "duration_minutes" INTEGER,
    CONSTRAINT "planner_stops_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "planner_itineraries"
  ADD COLUMN IF NOT EXISTS "schedule_label" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "cost_notes" TEXT NOT NULL DEFAULT '';

ALTER TABLE "planner_stops"
  ADD COLUMN IF NOT EXISTS "suggested_end" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "location" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "stop_type" TEXT NOT NULL DEFAULT 'experience',
  ADD COLUMN IF NOT EXISTS "included" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "additional_cost" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER;

CREATE INDEX IF NOT EXISTS "planner_itineraries_user_id_created_at_idx" ON "planner_itineraries"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "planner_stops_experience_id_idx" ON "planner_stops"("experience_id");
CREATE UNIQUE INDEX IF NOT EXISTS "planner_stops_itinerary_id_position_key" ON "planner_stops"("itinerary_id", "position");

DO $$ BEGIN
  ALTER TABLE "planner_itineraries" ADD CONSTRAINT "planner_itineraries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "planner_stops" ADD CONSTRAINT "planner_stops_itinerary_id_fkey" FOREIGN KEY ("itinerary_id") REFERENCES "planner_itineraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "planner_stops" ADD CONSTRAINT "planner_stops_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
