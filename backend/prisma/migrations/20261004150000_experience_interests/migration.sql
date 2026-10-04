-- Intereses relacionados de una experiencia. No borra categorías ni reasigna Recreativo/Turístico.

CREATE TABLE "interests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "interests_name_key" ON "interests"("name");

CREATE TABLE "experience_interests" (
    "experience_id" TEXT NOT NULL,
    "interest_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_interests_pkey" PRIMARY KEY ("experience_id","interest_id")
);

CREATE UNIQUE INDEX "experience_interests_experience_id_position_key" ON "experience_interests"("experience_id", "position");

CREATE INDEX "experience_interests_interest_id_idx" ON "experience_interests"("interest_id");

ALTER TABLE "experience_interests" ADD CONSTRAINT "experience_interests_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "experience_interests" ADD CONSTRAINT "experience_interests_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "interests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "interests" ("id", "name") VALUES
    ('c0ffee00-0000-4000-8000-000000000001', 'Naturaleza'),
    ('c0ffee00-0000-4000-8000-000000000002', 'Gastronomía'),
    ('c0ffee00-0000-4000-8000-000000000003', 'Cultura'),
    ('c0ffee00-0000-4000-8000-000000000004', 'Aventura'),
    ('c0ffee00-0000-4000-8000-000000000005', 'Bienestar'),
    ('c0ffee00-0000-4000-8000-000000000006', 'Arte y creatividad'),
    ('c0ffee00-0000-4000-8000-000000000007', 'Deportes'),
    ('c0ffee00-0000-4000-8000-000000000008', 'Historia y patrimonio'),
    ('c0ffee00-0000-4000-8000-000000000009', 'Música'),
    ('c0ffee00-0000-4000-8000-000000000010', 'Talleres'),
    ('c0ffee00-0000-4000-8000-000000000011', 'Planes urbanos'),
    ('c0ffee00-0000-4000-8000-000000000012', 'Café'),
    ('c0ffee00-0000-4000-8000-000000000013', 'Fotografía'),
    ('c0ffee00-0000-4000-8000-000000000014', 'Danza'),
    ('c0ffee00-0000-4000-8000-000000000015', 'Literatura'),
    ('c0ffee00-0000-4000-8000-000000000016', 'Vida nocturna')
ON CONFLICT ("name") DO NOTHING;

-- Equivalencias directas. Conserva el id de la categoría.
UPDATE "categories" SET "name" = 'Arte y creatividad', "updated_at" = CURRENT_TIMESTAMP WHERE "name" = 'Artístico';
UPDATE "categories" SET "name" = 'Cultura e historia', "updated_at" = CURRENT_TIMESTAMP WHERE "name" = 'Cultural';
UPDATE "categories" SET "name" = 'Bienestar y deporte', "updated_at" = CURRENT_TIMESTAMP WHERE "name" = 'Deportivo';

INSERT INTO "categories" ("id", "name", "description", "icon", "status", "created_at", "updated_at")
SELECT 'c0ffee00-0000-4000-8000-000000000101', 'Arte y creatividad', 'Prácticas artísticas y procesos creativos.', 'art', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Arte y creatividad');

INSERT INTO "categories" ("id", "name", "description", "icon", "status", "created_at", "updated_at")
SELECT 'c0ffee00-0000-4000-8000-000000000102', 'Cultura e historia', 'Memoria, patrimonio y expresiones culturales.', 'culture', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Cultura e historia');

INSERT INTO "categories" ("id", "name", "description", "icon", "status", "created_at", "updated_at")
SELECT 'c0ffee00-0000-4000-8000-000000000103', 'Gastronomía', 'Cocina, sabor y mesa.', 'food', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Gastronomía');

INSERT INTO "categories" ("id", "name", "description", "icon", "status", "created_at", "updated_at")
SELECT 'c0ffee00-0000-4000-8000-000000000104', 'Naturaleza y aventura', 'Aire libre, paisaje y recorrido.', 'nature', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Naturaleza y aventura');

INSERT INTO "categories" ("id", "name", "description", "icon", "status", "created_at", "updated_at")
SELECT 'c0ffee00-0000-4000-8000-000000000105', 'Bienestar y deporte', 'Movimiento, cuerpo y calma.', 'sport', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Bienestar y deporte');

INSERT INTO "categories" ("id", "name", "description", "icon", "status", "created_at", "updated_at")
SELECT 'c0ffee00-0000-4000-8000-000000000106', 'Planes urbanos', 'Ciudad, calle y vida cotidiana.', 'travel', 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Planes urbanos');
