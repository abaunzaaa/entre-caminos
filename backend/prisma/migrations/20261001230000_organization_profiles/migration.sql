-- CreateTable
CREATE TABLE "organization_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "trade_name" TEXT,
    "legal_name" TEXT,
    "description" TEXT,
    "logo_url" TEXT,
    "logo_public_id" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "website" TEXT,
    "department" TEXT,
    "city" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_profiles_user_id_key" ON "organization_profiles"("user_id");

-- CreateIndex
CREATE INDEX "organization_profiles_trade_name_idx" ON "organization_profiles"("trade_name");

-- AddForeignKey
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
