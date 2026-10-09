-- Reseña de visitante: comentario y fecha de edición.
-- La unicidad user_id + experience_id ya existe
-- (experience_visitor_reviews_experience_id_user_id_key).

ALTER TABLE "experience_visitor_reviews" ADD COLUMN "comment" TEXT NOT NULL DEFAULT '';

ALTER TABLE "experience_visitor_reviews" ADD COLUMN "updated_at" TIMESTAMP(3);

UPDATE "experience_visitor_reviews" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;

ALTER TABLE "experience_visitor_reviews" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "experience_visitor_reviews" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "experience_visitor_reviews"
  ADD CONSTRAINT "experience_visitor_reviews_rating_check"
  CHECK ("rating" >= 1 AND "rating" <= 5);
