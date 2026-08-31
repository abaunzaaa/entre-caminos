# Variables de entorno

Copiar `.env.example` a `backend/.env`. El backend lee `backend/.env` y, si existe, `.env` en la raíz.

Los secretos **nunca** van a GitHub.

## Backend

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Pooler Supabase transaction (puerto 6543), con `pgbouncer=true` |
| `DIRECT_URL` | Sí | Pooler Supabase session (puerto 5432). Migraciones Prisma |
| `JWT_ACCESS_SECRET` | Sí | ≥ 32 caracteres |
| `JWT_REFRESH_SECRET` | Sí | ≥ 32 caracteres |
| `FRONTEND_URL` | Sí | Origen CORS |
| `PORT` | No | Default 4000 |
| `BCRYPT_ROUNDS` | No | Default 12 |
| `SEED_ADMIN_PASSWORD` | Solo seed | Canal privado del equipo. Si lleva `#`, va entre comillas: `SEED_ADMIN_PASSWORD="Clave#2026"` |
| `TEST_DATABASE_URL` | Solo tests | Otro proyecto Supabase; nunca la base compartida |
| `SENDGRID_API_KEY` | No | Si vacía, el correo se simula |
| `CLOUDINARY_*` | No | Si vacías, upload local |
| `MAPBOX_ACCESS_TOKEN` | No | Mapas |
| `OPENAI_API_KEY` | No | IA futura |

Guía completa: [database.md](database.md).

## Frontend

Archivo `frontend/.env`:

| Variable | Descripción |
| --- | --- |
| `VITE_API_URL` | Default `/api` (proxy de Vite) |
| `VITE_MAPBOX_TOKEN` | Token público de Mapbox |
| `VITE_APP_NAME` | Entre Caminos |

## Producción

- Rotar JWT secrets.
- `COOKIE_SECURE=true`
- `NODE_ENV=production`
- PostgreSQL en Supabase (`entre-caminos-db` u otro proyecto de prod).
- Frontend en Vercel, API en Render o Railway.
