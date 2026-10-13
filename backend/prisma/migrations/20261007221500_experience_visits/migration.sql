-- CreateTable
CREATE TABLE "experience_visits" (
    "id" TEXT NOT NULL,
    "experience_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "experience_visits_experience_id_idx" ON "experience_visits"("experience_id");

-- CreateIndex
CREATE INDEX "experience_visits_user_id_created_at_idx" ON "experience_visits"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "experience_visits_experience_id_user_id_key" ON "experience_visits"("experience_id", "user_id");

-- AddForeignKey
ALTER TABLE "experience_visits" ADD CONSTRAINT "experience_visits_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_visits" ADD CONSTRAINT "experience_visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
