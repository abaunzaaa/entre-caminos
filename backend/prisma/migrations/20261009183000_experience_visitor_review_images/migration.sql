-- Fotos opcionales de una reseña. El binario queda en Cloudinary; aquí solo la referencia.

CREATE TABLE "experience_visitor_review_images" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "public_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_visitor_review_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "experience_visitor_review_images_review_id_position_idx"
  ON "experience_visitor_review_images"("review_id", "position");

ALTER TABLE "experience_visitor_review_images"
  ADD CONSTRAINT "experience_visitor_review_images_review_id_fkey"
  FOREIGN KEY ("review_id") REFERENCES "experience_visitor_reviews"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
