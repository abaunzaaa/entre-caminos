-- CreateTable
CREATE TABLE "journey_boards" (
    "user_id" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'olive',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_boards_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "journey_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "experience_id" TEXT NOT NULL,
    "planned_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_decorations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sticker_key" TEXT,
    "text" TEXT,
    "color" TEXT,
    "day" TEXT,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_decorations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_memories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "happened_on" DATE NOT NULL,
    "story" TEXT NOT NULL DEFAULT '',
    "background" TEXT NOT NULL DEFAULT 'cream',
    "experience_id" TEXT,
    "plan_id" TEXT,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_memory_photos" (
    "id" TEXT NOT NULL,
    "memory_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journey_memory_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_memory_stickers" (
    "id" TEXT NOT NULL,
    "memory_id" TEXT NOT NULL,
    "sticker_key" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT -6,

    CONSTRAINT "journey_memory_stickers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "journey_plans_user_id_planned_at_idx" ON "journey_plans"("user_id", "planned_at");

-- CreateIndex
CREATE INDEX "journey_plans_experience_id_idx" ON "journey_plans"("experience_id");

-- CreateIndex
CREATE INDEX "journey_decorations_user_id_idx" ON "journey_decorations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "journey_memories_plan_id_key" ON "journey_memories"("plan_id");

-- CreateIndex
CREATE INDEX "journey_memories_user_id_happened_on_idx" ON "journey_memories"("user_id", "happened_on");

-- CreateIndex
CREATE INDEX "journey_memories_experience_id_idx" ON "journey_memories"("experience_id");

-- CreateIndex
CREATE INDEX "journey_memory_photos_memory_id_sort_order_idx" ON "journey_memory_photos"("memory_id", "sort_order");

-- CreateIndex
CREATE INDEX "journey_memory_stickers_memory_id_idx" ON "journey_memory_stickers"("memory_id");

-- AddForeignKey
ALTER TABLE "journey_boards" ADD CONSTRAINT "journey_boards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_plans" ADD CONSTRAINT "journey_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_plans" ADD CONSTRAINT "journey_plans_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_decorations" ADD CONSTRAINT "journey_decorations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_memories" ADD CONSTRAINT "journey_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_memories" ADD CONSTRAINT "journey_memories_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_memories" ADD CONSTRAINT "journey_memories_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "journey_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_memory_photos" ADD CONSTRAINT "journey_memory_photos_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "journey_memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_memory_stickers" ADD CONSTRAINT "journey_memory_stickers_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "journey_memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
