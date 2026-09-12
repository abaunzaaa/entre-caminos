-- CreateEnum
CREATE TYPE "ProfileImageType" AS ENUM ('PHOTO', 'AVATAR');

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "country" TEXT,
    "department" TEXT,
    "city" TEXT,
    "neighborhood" TEXT,
    "address_reference" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "profile_image_url" TEXT,
    "profile_image_public_id" TEXT,
    "profile_image_type" "ProfileImageType" NOT NULL DEFAULT 'AVATAR',
    "avatar_config" JSONB,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "companions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "places" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "music" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budget" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "climate" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");
CREATE INDEX "user_profiles_onboarding_completed_idx" ON "user_profiles"("onboarding_completed");

ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
