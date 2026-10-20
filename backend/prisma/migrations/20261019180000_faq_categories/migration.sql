-- Categorías propias de preguntas frecuentes y carga inicial idempotente.

CREATE TABLE "faq_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "faq_categories_slug_key" ON "faq_categories"("slug");

ALTER TABLE "faqs" ADD COLUMN "category_id" TEXT;
ALTER TABLE "faqs" ADD COLUMN "seed_key" TEXT;

CREATE UNIQUE INDEX "faqs_seed_key_key" ON "faqs"("seed_key");
CREATE INDEX "faqs_category_id_idx" ON "faqs"("category_id");

ALTER TABLE "faqs" ADD CONSTRAINT "faqs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "faq_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "faq_categories" ("id", "name", "slug", "sort_order", "created_at", "updated_at")
SELECT gen_random_uuid(), 'General', 'general', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "faq_categories" WHERE "slug" = 'general');

INSERT INTO "faq_categories" ("id", "name", "slug", "sort_order", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Experiencias', 'experiencias', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "faq_categories" WHERE "slug" = 'experiencias');

INSERT INTO "faq_categories" ("id", "name", "slug", "sort_order", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Mi cuenta', 'mi-cuenta', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "faq_categories" WHERE "slug" = 'mi-cuenta');

INSERT INTO "faq_categories" ("id", "name", "slug", "sort_order", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Mis caminos', 'mis-caminos', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "faq_categories" WHERE "slug" = 'mis-caminos');

INSERT INTO "faq_categories" ("id", "name", "slug", "sort_order", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Ayuda', 'ayuda', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "faq_categories" WHERE "slug" = 'ayuda');

INSERT INTO "faqs" ("id", "subject", "question", "answer", "status", "source", "category_id", "seed_key", "published_at", "created_at", "updated_at")
SELECT gen_random_uuid(), 'General', item.question, item.answer, 'PUBLISHED', 'ADMIN_CREATED', category.id, item.seed_key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('general-que-es', '¿Qué es Entre Caminos?', $ec$Entre Caminos es una plataforma donde puedes descubrir experiencias culturales, gastronómicas, recreativas, artísticas y turísticas, explorar diferentes planes y encontrar nuevas formas de disfrutar tu tiempo.$ec$),
  ('general-registro', '¿Necesito registrarme para explorar las experiencias?', $ec$Puedes explorar las experiencias disponibles sin iniciar sesión. Para utilizar funciones personales, como guardar favoritos o registrar experiencias visitadas, necesitas tener una cuenta.$ec$),
  ('general-gratuitas', '¿Las experiencias de Entre Caminos son gratuitas?', $ec$Algunas experiencias pueden ser gratuitas y otras tener un costo. Puedes consultar el precio de cada actividad en su página de detalle, cuando esa información esté disponible.$ec$)
) AS item(seed_key, question, answer)
JOIN "faq_categories" AS category ON category.slug = 'general'
WHERE NOT EXISTS (SELECT 1 FROM "faqs" WHERE "faqs"."seed_key" = item.seed_key);

INSERT INTO "faqs" ("id", "subject", "question", "answer", "status", "source", "category_id", "seed_key", "published_at", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Experiencias', item.question, item.answer, 'PUBLISHED', 'ADMIN_CREATED', category.id, item.seed_key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('experiencias-encontrar', '¿Cómo puedo encontrar experiencias que me interesen?', $ec$Puedes explorar el catálogo, utilizar los filtros disponibles y consultar las experiencias recomendadas según tus intereses.$ec$),
  ('experiencias-ubicacion', '¿Cómo puedo conocer la ubicación de una experiencia?', $ec$En el detalle de cada experiencia puedes consultar la información de ubicación disponible y utilizar las opciones de mapa o indicaciones cuando estén habilitadas.$ec$),
  ('experiencias-contacto', '¿Cómo puedo contactar al organizador de una experiencia?', $ec$En el detalle de la experiencia encontrarás la información de contacto proporcionada por su organizador y, cuando exista, un enlace externo para obtener más información.$ec$),
  ('experiencias-favoritos', '¿Puedo guardar experiencias para verlas después?', $ec$Sí. Si has iniciado sesión, puedes agregar experiencias a tus favoritos para encontrarlas fácilmente cuando quieras volver a consultarlas.$ec$)
) AS item(seed_key, question, answer)
JOIN "faq_categories" AS category ON category.slug = 'experiencias'
WHERE NOT EXISTS (SELECT 1 FROM "faqs" WHERE "faqs"."seed_key" = item.seed_key);

INSERT INTO "faqs" ("id", "subject", "question", "answer", "status", "source", "category_id", "seed_key", "published_at", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Mi cuenta', item.question, item.answer, 'PUBLISHED', 'ADMIN_CREATED', category.id, item.seed_key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('cuenta-crear', '¿Cómo puedo crear una cuenta?', $ec$Puedes registrarte utilizando las opciones disponibles en la plataforma y completar los datos solicitados durante el proceso.$ec$),
  ('cuenta-preferencias', '¿Puedo modificar mis intereses y preferencias?', $ec$Sí. Desde tu perfil puedes gestionar las preferencias que estén disponibles para personalizar tu experiencia en Entre Caminos.$ec$)
) AS item(seed_key, question, answer)
JOIN "faq_categories" AS category ON category.slug = 'mi-cuenta'
WHERE NOT EXISTS (SELECT 1 FROM "faqs" WHERE "faqs"."seed_key" = item.seed_key);

INSERT INTO "faqs" ("id", "subject", "question", "answer", "status", "source", "category_id", "seed_key", "published_at", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Mis caminos', item.question, item.answer, 'PUBLISHED', 'ADMIN_CREATED', category.id, item.seed_key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('caminos-que-es', '¿Qué es Mis Caminos?', $ec$Mis Caminos es un espacio personal donde puedes organizar tus próximos planes y llevar un registro de las experiencias que quieres disfrutar.$ec$),
  ('caminos-estampitas', '¿Qué son las estampitas?', $ec$Las estampitas son recuerdos digitales que coleccionas al marcar una experiencia como visitada. Puedes consultarlas desde la sección de estampitas de tu perfil.$ec$),
  ('caminos-conseguir', '¿Cómo consigo una estampita?', $ec$Cuando hayas realizado una experiencia, puedes marcarla como «Ya visité». Si tiene una estampita asociada, aparecerá en tu colección personal.$ec$)
) AS item(seed_key, question, answer)
JOIN "faq_categories" AS category ON category.slug = 'mis-caminos'
WHERE NOT EXISTS (SELECT 1 FROM "faqs" WHERE "faqs"."seed_key" = item.seed_key);

INSERT INTO "faqs" ("id", "subject", "question", "answer", "status", "source", "category_id", "seed_key", "published_at", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Ayuda', item.question, item.answer, 'PUBLISHED', 'ADMIN_CREATED', category.id, item.seed_key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('ayuda-enviar', '¿Cómo puedo enviar una pregunta que no aparece aquí?', $ec$Puedes utilizar el formulario de esta sección para enviarnos tu duda. Nuestro equipo podrá revisarla y responderla.$ec$)
) AS item(seed_key, question, answer)
JOIN "faq_categories" AS category ON category.slug = 'ayuda'
WHERE NOT EXISTS (SELECT 1 FROM "faqs" WHERE "faqs"."seed_key" = item.seed_key);
