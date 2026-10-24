-- Itinerarios compuestos de la HU-28. No altera planes, reservas ni visitas existentes.

CREATE TABLE "planner_itineraries" (
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planner_itineraries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "planner_stops" (
    "id" TEXT NOT NULL,
    "itinerary_id" TEXT NOT NULL,
    "experience_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "suggested_at" TEXT NOT NULL DEFAULT '',
    "blurb" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "planner_stops_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "planner_itineraries_user_id_created_at_idx" ON "planner_itineraries"("user_id", "created_at");

CREATE INDEX "planner_stops_experience_id_idx" ON "planner_stops"("experience_id");

CREATE UNIQUE INDEX "planner_stops_itinerary_id_position_key" ON "planner_stops"("itinerary_id", "position");

ALTER TABLE "planner_itineraries" ADD CONSTRAINT "planner_itineraries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "planner_stops" ADD CONSTRAINT "planner_stops_itinerary_id_fkey" FOREIGN KEY ("itinerary_id") REFERENCES "planner_itineraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "planner_stops" ADD CONSTRAINT "planner_stops_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
