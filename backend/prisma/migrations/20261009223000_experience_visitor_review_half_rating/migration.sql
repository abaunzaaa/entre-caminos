-- Experiencia general pasa de entero a decimal para medias estrellas (1, 1.5, …, 5).

ALTER TABLE "experience_visitor_reviews"
  ALTER COLUMN "rating" TYPE DECIMAL(2, 1)
  USING "rating"::decimal(2, 1);

ALTER TABLE "experience_visitor_reviews"
  DROP CONSTRAINT "experience_visitor_reviews_rating_check";

ALTER TABLE "experience_visitor_reviews"
  ADD CONSTRAINT "experience_visitor_reviews_rating_check"
  CHECK (
    "rating" >= 1
    AND "rating" <= 5
    AND ("rating" * 2) = trunc("rating" * 2)
  );
