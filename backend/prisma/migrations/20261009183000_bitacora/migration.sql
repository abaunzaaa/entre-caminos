-- Diario creativo. Aditivo: no modifica recuerdos ni planes existentes.

CREATE TABLE "bitacoras" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bitacoras_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bitacoras_user_id_key" ON "bitacoras"("user_id");

CREATE TABLE "bitacora_pages" (
    "id" TEXT NOT NULL,
    "bitacora_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "background" TEXT NOT NULL DEFAULT 'cream',
    "elements" JSONB NOT NULL DEFAULT '[]',
    "experience_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bitacora_pages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bitacora_pages_bitacora_id_sort_order_idx" ON "bitacora_pages"("bitacora_id", "sort_order");
CREATE INDEX "bitacora_pages_experience_id_idx" ON "bitacora_pages"("experience_id");

CREATE TABLE "bitacora_assets" (
    "id" TEXT NOT NULL,
    "bitacora_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_assets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bitacora_assets_bitacora_id_idx" ON "bitacora_assets"("bitacora_id");
CREATE INDEX "bitacora_assets_user_id_idx" ON "bitacora_assets"("user_id");

ALTER TABLE "bitacoras" ADD CONSTRAINT "bitacoras_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bitacora_pages" ADD CONSTRAINT "bitacora_pages_bitacora_id_fkey" FOREIGN KEY ("bitacora_id") REFERENCES "bitacoras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bitacora_pages" ADD CONSTRAINT "bitacora_pages_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bitacora_assets" ADD CONSTRAINT "bitacora_assets_bitacora_id_fkey" FOREIGN KEY ("bitacora_id") REFERENCES "bitacoras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bitacora_assets" ADD CONSTRAINT "bitacora_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
