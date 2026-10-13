-- Dimensiones complementarias. Nulas a propósito: las reseñas ya guardadas
-- solo tienen rating (experiencia general) y comentario.

ALTER TABLE "experience_visitor_reviews" ADD COLUMN "organization_rating" INTEGER;
ALTER TABLE "experience_visitor_reviews" ADD COLUMN "value_rating" INTEGER;
ALTER TABLE "experience_visitor_reviews" ADD COLUMN "recommended" BOOLEAN;

ALTER TABLE "experience_visitor_reviews"
  ADD CONSTRAINT "experience_visitor_reviews_organization_rating_check"
  CHECK ("organization_rating" IS NULL OR ("organization_rating" >= 1 AND "organization_rating" <= 5));

ALTER TABLE "experience_visitor_reviews"
  ADD CONSTRAINT "experience_visitor_reviews_value_rating_check"
  CHECK ("value_rating" IS NULL OR ("value_rating" >= 1 AND "value_rating" <= 5));
