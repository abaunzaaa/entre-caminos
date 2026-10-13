-- La reseña apunta a ExperienceLocation. No se copia el nombre de la sede.
-- Solo se rellena location_id cuando la experiencia tiene exactamente una sede.
-- Si tenía varias, la reseña queda con location_id nulo: no se adivina la sede.

ALTER TABLE "experience_visitor_reviews"
  ADD COLUMN "location_id" TEXT;

UPDATE "experience_visitor_reviews" AS review
SET "location_id" = place.id
FROM "experience_locations" AS place
WHERE review.experience_id = place.experience_id
  AND (
    SELECT COUNT(*)
    FROM "experience_locations" AS sibling
    WHERE sibling.experience_id = review.experience_id
  ) = 1;

ALTER TABLE "experience_visitor_reviews"
  ADD CONSTRAINT "experience_visitor_reviews_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "experience_locations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "experience_visitor_reviews"
  DROP CONSTRAINT IF EXISTS "experience_visitor_reviews_experience_id_user_id_key";

DROP INDEX IF EXISTS "experience_visitor_reviews_experience_id_user_id_key";

ALTER TABLE "experience_visitor_reviews"
  ADD CONSTRAINT "visitor_reviews_user_experience_location_key"
  UNIQUE ("experience_id", "user_id", "location_id");

CREATE INDEX "experience_visitor_reviews_location_id_idx"
  ON "experience_visitor_reviews"("location_id");
