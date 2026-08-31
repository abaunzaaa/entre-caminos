# Base de datos — Entre Caminos

PostgreSQL oficial del equipo: **Supabase**, proyecto `entre-caminos-db`.

```
React (Vite)
    ↓ HTTPS / JSON
Node.js + Express + TypeScript
    ↓ Prisma
PostgreSQL (Supabase)
```

El frontend nunca habla con Prisma ni con Supabase. Solo el backend.

No hay PostgreSQL local. No hay Docker. Las tres integrantes (Juliana, Angie, Natalia) usan **la misma** base compartida.

## Arquitectura de datos (Sprint 1)

```
ROLE ← USER → AUDIT_LOG
  ↓              ↑
PERMISSION     EXPERIENCE → USER (creador)
                  ↓
               CATEGORY
```

Tablas Prisma (`backend/prisma/schema.prisma`):

| Tabla | Uso |
| --- | --- |
| `roles` | USER, ADMIN, SUPER_ADMIN |
| `permissions` | Claves RBAC del Sprint 1 |
| `role_permissions` | N:N rol–permiso |
| `users` | Cuentas (password con bcrypt, nunca texto plano) |
| `categories` | Cultural, Deportivo, Recreativo, Turístico |
| `experiences` | Catálogo (DRAFT / PENDING / PUBLISHED / ARCHIVED) |
| `audit_logs` | Bitácora administrativa |
| `password_reset_tokens` | Recuperación de contraseña |
| `email_verification_tokens` | Verificación de correo |

El esquema deja espacio para preferencias, favoritos, reseñas, historial, estampitas, planes grupales y recomendaciones IA. Esas HUs no forman parte de este Sprint.

## Variables de entorno

Copiar `.env.example` → `backend/.env` (y opcionalmente `.env` en la raíz). **Nunca** subir `.env`.

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Shared Pooler, **transaction** mode, puerto **6543**. App y Prisma Client. Añade `pgbouncer=true`. |
| `DIRECT_URL` | Shared Pooler, **session** mode, puerto **5432**. Migraciones Prisma. |
| `SEED_ADMIN_PASSWORD` | Solo para `npm run prisma:seed`. Canal privado del equipo. |

En Supabase: **Project Settings → Database → Connect**. Elige el modo URI / Prisma. Transaction = `DATABASE_URL`. Session = `DIRECT_URL`. Incluye `sslmode=require`.

Ejemplo de forma (sin contraseña real):

```
DATABASE_URL="postgresql://postgres.xxxx:[PASSWORD]@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres.xxxx:[PASSWORD]@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require"
```

Cómo saber que no es local: el host debe contener `pooler.supabase.com` (o `supabase.co`). Si ves `localhost` o `:5432` sin `supabase`, estás en la base equivocada.

## Prisma

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run db:verify
npx prisma studio
```

- `migrate deploy` aplica migraciones pendientes. **No** uses `prisma migrate reset` sobre la base compartida: borra datos de todo el equipo.
- `prisma studio` abre `http://localhost:5555` contra las URLs de tu `.env`. El pie / host de conexión debe ser Supabase, no `localhost:5432` de un Postgres instalado.

## Migraciones

Fuente de verdad: `backend/prisma/migrations/`.

Están versionadas en GitHub. En una base vacía de Supabase, `migrate deploy` crea el esquema. Si las tablas ya existen y Prisma pregunta, no hagas reset; revisa `_prisma_migrations` en el Table Editor de Supabase.

## Seed

`backend/prisma/seed.ts` hace upsert (no borra el catálogo existente):

- Roles USER, ADMIN, SUPER_ADMIN
- Permisos del Sprint 1
- Tres SUPER_ADMIN (Angie, Natalia, Juliana)
- Categorías Cultural, Deportivo, Recreativo, Turístico
- Experiencias de ejemplo (varias PUBLISHED)

Las contraseñas se hashean con bcrypt. La clave de semilla vive solo en `.env` local.

## Configuración para una integrante nueva

1. Clonar el repo. Instalar Node 20+.
2. `npm install` en `frontend/` y `backend/` (o `--prefix`).
3. Copiar `.env.example` a `backend/.env`.
4. Pegar `DATABASE_URL` y `DIRECT_URL` que comparte el equipo (no están en GitHub).
5. Completar JWT secrets (≥ 32 caracteres) y `SEED_ADMIN_PASSWORD` (canal privado).
6. `cd backend && npx prisma generate`
7. `npx prisma migrate deploy` (solo aplica lo pendiente; no resetea).
8. `npm run prisma:seed` si hace falta poblar roles/catálogo.
9. `npm run db:verify` — el host debe ser Supabase.
10. `npm run dev` (backend) y `npm run dev` (frontend).

No instales Docker. No levantes PostgreSQL local.

## Qué sube a GitHub

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/`
- `backend/prisma/seed.ts`
- `.env.example` y `backend/.env.example` (sin secretos)
- `docs/database.md`

## Qué NO sube a GitHub

- `.env`, `backend/.env`, `.env.local`
- Contraseñas, tokens, URIs con password
- Service role key de Supabase
- JWT secrets reales de producción

## Buenas prácticas

- Una sola base compartida de desarrollo: `entre-caminos-db`.
- Nunca `migrate reset` ni borrar tablas a mano en el dashboard si hay datos del equipo.
- Tests automatizados: `TEST_DATABASE_URL` debe apuntar a **otro** proyecto Supabase de prueba, nunca al compartido.
- Rotar la contraseña de la base si se filtra un `.env`.
