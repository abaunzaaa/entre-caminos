-- Relación principal Experience ↔ Categories. category_id de experiences queda como la primera categoría.

CREATE TABLE "experience_categories" (
    "experience_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_categories_pkey" PRIMARY KEY ("experience_id","category_id")
);

CREATE UNIQUE INDEX "experience_categories_experience_id_position_key" ON "experience_categories"("experience_id", "position");

CREATE INDEX "experience_categories_category_id_idx" ON "experience_categories"("category_id");

ALTER TABLE "experience_categories" ADD CONSTRAINT "experience_categories_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "experience_categories" ADD CONSTRAINT "experience_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cada experiencia existente conserva su única categoría como posición 1.
INSERT INTO "experience_categories" ("experience_id", "category_id", "position", "created_at")
SELECT "id", "category_id", 1, CURRENT_TIMESTAMP
FROM "experiences"
WHERE "category_id" IS NOT NULL;
