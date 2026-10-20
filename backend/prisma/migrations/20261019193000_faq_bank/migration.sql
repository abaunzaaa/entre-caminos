-- Amplía el banco de preguntas frecuentes sin tocar las ya cargadas.

UPDATE "faq_categories" SET "sort_order" = 6, "updated_at" = CURRENT_TIMESTAMP WHERE "slug" = 'mis-caminos';
UPDATE "faq_categories" SET "sort_order" = 9, "updated_at" = CURRENT_TIMESTAMP WHERE "slug" = 'ayuda';

INSERT INTO "faq_categories" ("id", "name", "slug", "sort_order", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Favoritos', 'favoritos', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "faq_categories" WHERE "slug" = 'favoritos');

INSERT INTO "faq_categories" ("id", "name", "slug", "sort_order", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Estampitas', 'estampitas', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "faq_categories" WHERE "slug" = 'estampitas');

INSERT INTO "faq_categories" ("id", "name", "slug", "sort_order", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Plan con amigos', 'plan-con-amigos', 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "faq_categories" WHERE "slug" = 'plan-con-amigos');

INSERT INTO "faq_categories" ("id", "name", "slug", "sort_order", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Mapa', 'mapa', 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "faq_categories" WHERE "slug" = 'mapa');

INSERT INTO "faqs" ("id", "subject", "question", "answer", "status", "source", "category_id", "seed_key", "published_at", "created_at", "updated_at")
SELECT gen_random_uuid(), 'General', item.question, item.answer, 'PUBLISHED', 'ADMIN_CREATED', category.id, item.seed_key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('general-que-puedo', '¿Qué puedo hacer en Entre Caminos?', $ec$Puedes explorar experiencias, filtrarlas por lo que buscas, guardar favoritos si tienes cuenta, organizar planes en Mis Caminos y coleccionar estampitas de las experiencias que marques como visitadas.$ec$),
  ('general-organiza', '¿Entre Caminos organiza directamente las experiencias?', $ec$Entre Caminos es la plataforma para descubrirlas. Los detalles de cada experiencia, como precio, horario o contacto, los publica quien la ofrece. En el detalle encuentras esa información cuando está disponible.$ec$),
  ('general-como-funciona', '¿Cómo funciona la plataforma?', $ec$Exploras el catálogo, abres el detalle de una experiencia y, si inicias sesión, puedes guardar favoritos, ajustar tus intereses y organizar lo que quieres vivir en Mis Caminos.$ec$),
  ('general-celular', '¿Puedo usar Entre Caminos desde el celular?', $ec$Sí. Puedes abrir Entre Caminos en el navegador de tu celular. La plataforma se adapta a la pantalla.$ec$)
) AS item(seed_key, question, answer)
JOIN "faq_categories" AS category ON category.slug = 'general'
WHERE NOT EXISTS (SELECT 1 FROM "faqs" WHERE "faqs"."seed_key" = item.seed_key);

INSERT INTO "faqs" ("id", "subject", "question", "answer", "status", "source", "category_id", "seed_key", "published_at", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Experiencias', item.question, item.answer, 'PUBLISHED', 'ADMIN_CREATED', category.id, item.seed_key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('experiencias-disponible', '¿Cómo sé si una experiencia está disponible?', $ec$En el detalle de la experiencia puedes ver la disponibilidad publicada: todos los días, algunos días, fechas concretas o «Próximamente». Si no aparece, esa información todavía no está cargada.$ec$),
  ('experiencias-precio', '¿Cómo veo el precio de una experiencia?', $ec$El precio se muestra en el detalle de la experiencia cuando quien la ofrece lo ha publicado. Si no lo ves, aún no está informado.$ec$),
  ('experiencias-proximamente', '¿Qué pasa si una experiencia dice «Próximamente»?', $ec$Significa que todavía no está disponible para vivirla. Puedes ver la información que ya esté publicada y volver más adelante.$ec$),
  ('experiencias-duracion', '¿Cómo veo cuánto dura una experiencia?', $ec$La duración aparece en el detalle cuando está registrada, en minutos, horas o días. Si no la encuentras, aún no fue publicada.$ec$),
  ('experiencias-horario', '¿Las experiencias tienen horario?', $ec$Algunas sí. Cuando el organizador indica días, fechas u horarios, los ves en el detalle de la experiencia.$ec$),
  ('experiencias-ubicaciones', '¿Puedo ver varias ubicaciones de una experiencia?', $ec$Si una experiencia tiene más de un lugar, esas ubicaciones se muestran en su detalle. Cada sede aparece cuando esa información está cargada.$ec$),
  ('experiencias-categoria', '¿Cómo encuentro experiencias por categoría?', $ec$En Explorar puedes usar el filtro de categoría, además de ciudad, presupuesto y tipo de plan, y también buscar por nombre.$ec$),
  ('experiencias-recomendadas', '¿Cómo descubro experiencias recomendadas para mí?', $ec$Si tienes cuenta e indicas tus intereses, Entre Caminos puede mostrarte experiencias elegidas a partir de esas preferencias. También puedes explorar todo el catálogo.$ec$)
) AS item(seed_key, question, answer)
JOIN "faq_categories" AS category ON category.slug = 'experiencias'
WHERE NOT EXISTS (SELECT 1 FROM "faqs" WHERE "faqs"."seed_key" = item.seed_key);

INSERT INTO "faqs" ("id", "subject", "question", "answer", "status", "source", "category_id", "seed_key", "published_at", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Mi cuenta', item.question, item.answer, 'PUBLISHED', 'ADMIN_CREATED', category.id, item.seed_key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('cuenta-sesion', '¿Cómo inicio sesión?', $ec$Entra en Acceder e ingresa el correo y la contraseña de tu cuenta. Si aún no tienes una, puedes registrarte desde la misma zona.$ec$),
  ('cuenta-google', '¿Puedo iniciar sesión con Google?', $ec$Sí. En el acceso y en el registro está la opción Continuar con Google.$ec$),
  ('cuenta-datos', '¿Cómo cambio mis datos personales?', $ec$Con la sesión iniciada, abre tu perfil y edita los datos que la plataforma te permita actualizar.$ec$),
  ('cuenta-olvido', '¿Qué hago si olvidé mi contraseña?', $ec$En Acceder elige ¿Olvidaste tu contraseña? y sigue el enlace que enviamos a tu correo para crear una nueva.$ec$)
) AS item(seed_key, question, answer)
JOIN "faq_categories" AS category ON category.slug = 'mi-cuenta'
WHERE NOT EXISTS (SELECT 1 FROM "faqs" WHERE "faqs"."seed_key" = item.seed_key);

INSERT INTO "faqs" ("id", "subject", "question", "answer", "status", "source", "category_id", "seed_key", "published_at", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Mis caminos', item.question, item.answer, 'PUBLISHED', 'ADMIN_CREATED', category.id, item.seed_key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('caminos-agregar', '¿Cómo agrego una experiencia a Mis Caminos?', $ec$Con la sesión iniciada, abre Mis Caminos y suma la experiencia a tus planes. Desde ahí puedes tenerla a la vista junto con lo que quieres vivir.$ec$),
  ('caminos-personalizar', '¿Puedo personalizar mi calendario?', $ec$Sí. En Mis Caminos puedes ajustar la presentación de tu espacio, con los fondos y stickers disponibles, para organizar tus planes a tu manera.$ec$),
  ('caminos-proximos', '¿Qué son los próximos planes?', $ec$Son las experiencias que dejaste listas para más adelante en Mis Caminos. Si todavía no agregas ninguna, esa sección aparece vacía.$ec$),
  ('caminos-organizar', '¿Cómo organizo mejor mis experiencias?', $ec$Usa favoritos para lo que quieres recordar y Mis Caminos para armar tus próximos planes. Las experiencias que marques como visitadas quedan en tu recorrido.$ec$)
) AS item(seed_key, question, answer)
JOIN "faq_categories" AS category ON category.slug = 'mis-caminos'
WHERE NOT EXISTS (SELECT 1 FROM "faqs" WHERE "faqs"."seed_key" = item.seed_key);

INSERT INTO "faqs" ("id", "subject", "question", "answer", "status", "source", "category_id", "seed_key", "published_at", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Ayuda', item.question, item.answer, 'PUBLISHED', 'ADMIN_CREATED', category.id, item.seed_key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('ayuda-reportar', '¿Dónde puedo reportar un problema?', $ec$Escríbenos desde Contacto o envía tu mensaje con «Hacer una pregunta» en Preguntas frecuentes. El equipo lo revisa desde el panel de administración.$ec$),
  ('ayuda-respuesta', '¿Cómo sé si respondieron mi pregunta?', $ec$Hoy no enviamos un aviso a tu cuenta cuando respondemos. Si el equipo decide publicarla, la respuesta aparece en Preguntas frecuentes.$ec$),
  ('ayuda-sugerir', '¿Puedo sugerir una nueva pregunta frecuente?', $ec$Sí. Usa «Hacer una pregunta» y cuéntanos qué te gustaría ver aquí. El equipo la revisa antes de publicarla.$ec$)
) AS item(seed_key, question, answer)
JOIN "faq_categories" AS category ON category.slug = 'ayuda'
WHERE NOT EXISTS (SELECT 1 FROM "faqs" WHERE "faqs"."seed_key" = item.seed_key);

INSERT INTO "faqs" ("id", "subject", "question", "answer", "status", "source", "category_id", "seed_key", "published_at", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Favoritos', item.question, item.answer, 'PUBLISHED', 'ADMIN_CREATED', category.id, item.seed_key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('favoritos-como', '¿Cómo guardo una experiencia en favoritos?', $ec$Inicia sesión, abre la experiencia y márcala como favorita. Sin cuenta puedes explorarla, pero no guardarla.$ec$),
  ('favoritos-donde', '¿Dónde encuentro mis favoritos?', $ec$Entra a Favoritos desde el menú del explorador. Ahí están las experiencias que guardaste.$ec$),
  ('favoritos-quitar', '¿Puedo quitar una experiencia de favoritos?', $ec$Sí. Vuelve a usar la acción de favoritos en la experiencia o quítala desde tu lista de Favoritos.$ec$)
) AS item(seed_key, question, answer)
JOIN "faq_categories" AS category ON category.slug = 'favoritos'
WHERE NOT EXISTS (SELECT 1 FROM "faqs" WHERE "faqs"."seed_key" = item.seed_key);

INSERT INTO "faqs" ("id", "subject", "question", "answer", "status", "source", "category_id", "seed_key", "published_at", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Estampitas', item.question, item.answer, 'PUBLISHED', 'ADMIN_CREATED', category.id, item.seed_key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('estampitas-no-aparece', '¿Por qué una experiencia visitada no muestra estampita?', $ec$Marcar «Ya visité» registra la visita. La estampita solo aparece si esa experiencia tiene una asociada. Si no la tiene, la visita queda sin estampita.$ec$),
  ('estampitas-coleccion', '¿Dónde veo mi colección de estampitas?', $ec$Con la sesión iniciada, abre la sección de estampitas de tu perfil. Ahí está la colección de las que ya desbloqueaste.$ec$),
  ('estampitas-detalle', '¿Puedo ver la información de la experiencia desde una estampita?', $ec$La estampita corresponde a una experiencia del catálogo. Desde tu colección puedes identificarla y abrir su detalle cuando ese enlace está disponible.$ec$)
) AS item(seed_key, question, answer)
JOIN "faq_categories" AS category ON category.slug = 'estampitas'
WHERE NOT EXISTS (SELECT 1 FROM "faqs" WHERE "faqs"."seed_key" = item.seed_key);

INSERT INTO "faqs" ("id", "subject", "question", "answer", "status", "source", "category_id", "seed_key", "published_at", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Plan con amigos', item.question, item.answer, 'PUBLISHED', 'ADMIN_CREATED', category.id, item.seed_key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('amigos-que-es', '¿Qué es Plan con amigos?', $ec$Es una sección del explorador pensada para planear en grupo. La herramienta todavía está en preparación. Mientras tanto puedes guardar favoritos y organizar tus planes en Mis Caminos.$ec$),
  ('amigos-compatibilidad', '¿Cómo funciona la compatibilidad grupal?', $ec$Todavía no hay una comparación automática de gustos entre varias personas. Las recomendaciones actuales se arman con los intereses de tu propia cuenta.$ec$),
  ('amigos-comparar', '¿Puedo comparar gustos con otras personas?', $ec$Esa comparación aún no está disponible. Puedes revisar tus intereses en el perfil y explorar las experiencias recomendadas para ti.$ec$),
  ('amigos-que-toma', '¿Qué toma en cuenta la compatibilidad?', $ec$Hoy no hay un cálculo de compatibilidad entre cuentas. Lo que sí usa Entre Caminos son los intereses que guardas en tu perfil para sugerirte experiencias.$ec$)
) AS item(seed_key, question, answer)
JOIN "faq_categories" AS category ON category.slug = 'plan-con-amigos'
WHERE NOT EXISTS (SELECT 1 FROM "faqs" WHERE "faqs"."seed_key" = item.seed_key);

INSERT INTO "faqs" ("id", "subject", "question", "answer", "status", "source", "category_id", "seed_key", "published_at", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Mapa', item.question, item.answer, 'PUBLISHED', 'ADMIN_CREATED', category.id, item.seed_key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('mapa-como', '¿Cómo funciona el mapa?', $ec$El mapa interactivo del explorador todavía no está listo. Mientras tanto, la ubicación se consulta en el detalle de cada experiencia.$ec$),
  ('mapa-sin-mapa', '¿Qué hago si una experiencia no muestra mapa?', $ec$Revisa el texto de ubicación en su detalle. Si no hay mapa ni dirección, esa información aún no fue publicada.$ec$),
  ('mapa-ubicacion', '¿Puedo buscar experiencias por ubicación?', $ec$Sí. En Explorar puedes filtrar por ciudad y usar el buscador. La ubicación concreta de cada plan está en su detalle.$ec$),
  ('mapa-llegar', '¿Cómo llego a una experiencia?', $ec$Abre el detalle de la experiencia. Si hay indicaciones o un enlace de mapa, los encuentras ahí. Si no aparecen, la ruta todavía no está disponible.$ec$)
) AS item(seed_key, question, answer)
JOIN "faq_categories" AS category ON category.slug = 'mapa'
WHERE NOT EXISTS (SELECT 1 FROM "faqs" WHERE "faqs"."seed_key" = item.seed_key);

UPDATE "faqs"
SET "category_id" = (SELECT "id" FROM "faq_categories" WHERE "slug" = 'favoritos'),
    "updated_at" = CURRENT_TIMESTAMP
WHERE "seed_key" = 'experiencias-favoritos'
  AND EXISTS (SELECT 1 FROM "faq_categories" WHERE "slug" = 'favoritos');

UPDATE "faqs"
SET "category_id" = (SELECT "id" FROM "faq_categories" WHERE "slug" = 'estampitas'),
    "updated_at" = CURRENT_TIMESTAMP
WHERE "seed_key" IN ('caminos-estampitas', 'caminos-conseguir')
  AND EXISTS (SELECT 1 FROM "faq_categories" WHERE "slug" = 'estampitas');

