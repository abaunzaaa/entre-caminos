-- CreateTable
CREATE TABLE "favorite_collections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "favorite_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_collection_items" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "experience_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorite_collections_user_id_created_at_idx" ON "favorite_collections"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_collections_user_id_name_key" ON "favorite_collections"("user_id", "name");

-- CreateIndex
CREATE INDEX "favorite_collection_items_experience_id_idx" ON "favorite_collection_items"("experience_id");

-- CreateIndex
CREATE INDEX "favorite_collection_items_collection_id_created_at_idx" ON "favorite_collection_items"("collection_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_collection_items_collection_id_experience_id_key" ON "favorite_collection_items"("collection_id", "experience_id");

-- AddForeignKey
ALTER TABLE "favorite_collections" ADD CONSTRAINT "favorite_collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_collection_items" ADD CONSTRAINT "favorite_collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "favorite_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_collection_items" ADD CONSTRAINT "favorite_collection_items_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
