-- Sedes de una experiencia. Las columnas de ubicación de "experiences" se conservan
-- como espejo de la primera sede para el catálogo y las experiencias ya publicadas.

CREATE TABLE "experience_locations" (
    "id" TEXT NOT NULL,
    "experience_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "how_to_get_there" TEXT,
    "availability" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_locations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "experience_locations_experience_id_position_key" ON "experience_locations"("experience_id", "position");

CREATE INDEX "experience_locations_experience_id_idx" ON "experience_locations"("experience_id");

ALTER TABLE "experience_locations" ADD CONSTRAINT "experience_locations_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
