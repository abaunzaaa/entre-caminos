-- AlterTable
ALTER TABLE "experiences" ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "experiences" ADD COLUMN "featured_order" INTEGER;
ALTER TABLE "experiences" ADD COLUMN "featured_from" TIMESTAMP(3);
ALTER TABLE "experiences" ADD COLUMN "featured_until" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "experiences_is_featured_featured_order_idx" ON "experiences"("is_featured", "featured_order");

-- CreateTable
CREATE TABLE "experience_detail_views" (
    "id" TEXT NOT NULL,
    "experience_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_detail_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_favorites" (
    "id" TEXT NOT NULL,
    "experience_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_visitor_reviews" (
    "id" TEXT NOT NULL,
    "experience_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_visitor_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "experience_detail_views_experience_id_created_at_idx" ON "experience_detail_views"("experience_id", "created_at");

-- CreateIndex
CREATE INDEX "experience_favorites_experience_id_idx" ON "experience_favorites"("experience_id");

-- CreateIndex
CREATE UNIQUE INDEX "experience_favorites_experience_id_user_id_key" ON "experience_favorites"("experience_id", "user_id");

-- CreateIndex
CREATE INDEX "experience_visitor_reviews_experience_id_created_at_idx" ON "experience_visitor_reviews"("experience_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "experience_visitor_reviews_experience_id_user_id_key" ON "experience_visitor_reviews"("experience_id", "user_id");

-- AddForeignKey
ALTER TABLE "experience_detail_views" ADD CONSTRAINT "experience_detail_views_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_favorites" ADD CONSTRAINT "experience_favorites_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_favorites" ADD CONSTRAINT "experience_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_visitor_reviews" ADD CONSTRAINT "experience_visitor_reviews_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_visitor_reviews" ADD CONSTRAINT "experience_visitor_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
