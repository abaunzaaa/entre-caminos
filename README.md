# Entre Caminos

Plataforma digital para descubrir experiencias culturales, recreativas, deportivas y turísticas.

No es un CRUD académico: el Sprint 1 deja lista la identidad del usuario, la seguridad, la administración y la gestión inicial del catálogo, con arquitectura cliente-servidor por capas y un diseño editorial preparado para mercado.

## Arquitectura

```
entre-caminos/
├── frontend/     React + TypeScript + Vite + Tailwind CSS
├── backend/      Node.js + Express + TypeScript + Prisma
├── database/     Espejo documental de migraciones
└── docs/         API, historias, seguridad y GitHub
```

```
React
  ↓
Node.js + Express
  ↓
Prisma
  ↓
PostgreSQL (Supabase — proyecto entre-caminos-db)
```

Servicios externos preparados (no improvisados): Mapbox, OpenAI, SendGrid, Cloudinary/AWS S3.

## Requisitos

- Node.js 20+
- npm 10+
- Cuentas y URIs de **Supabase** (las comparte el equipo; no están en el repo)

No hace falta Docker ni PostgreSQL instalado en el PC.

## Instalación

```bash
cd entre-caminos
copy .env.example backend\.env   # Windows
# cp .env.example backend/.env  # macOS/Linux
```

Edita `backend/.env`: pega `DATABASE_URL` (pooler :6543) y `DIRECT_URL` (pooler :5432). Completa JWT y `SEED_ADMIN_PASSWORD` (canal privado del equipo).

```bash
npm install --prefix backend
npm install --prefix frontend
cd backend
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run db:verify
```

En otra terminal:

```bash
npm run dev:backend
```

En otra:

```bash
npm run dev:frontend
```

- Frontend: http://localhost:5173
- API: http://localhost:4000/api/health
- Prisma Studio: desde `backend/`, `npx prisma studio` → http://localhost:5555

Detalle de la base: [docs/database.md](docs/database.md).

## Cuentas semilla

El seed crea tres SUPER_ADMIN (Angie, Natalia, Juliana). El correo está en el seed; la contraseña es `SEED_ADMIN_PASSWORD` de tu `.env` local. No se publica en GitHub.

La política de contraseñas exige mayúscula, minúscula, número y símbolo.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev:frontend` | Vite en :5173 |
| `npm run dev:backend` | API en :4000 |
| `npm run db:migrate` | `prisma migrate deploy` (Supabase) |
| `npm run db:seed` | Semilla idempotente |
| `npm run db:studio` | Prisma Studio |
| `npm run db:verify` | Comprueba host Supabase y conteos |
| `npm test` | API tests (requiere `TEST_DATABASE_URL` distinta de la base compartida) |

## Variables de entorno

Ver `.env.example`, `backend/.env.example` y `docs/ENV.md`.

Mínimas para desarrollo:

- `DATABASE_URL` / `DIRECT_URL` (Supabase)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (mínimo 32 caracteres)
- `FRONTEND_URL`
- `SEED_ADMIN_PASSWORD` (solo para seed)

Opcionales:

- `SENDGRID_API_KEY` — correos reales; si falta, se simulan en logs
- `CLOUDINARY_*` — si faltan, las imágenes se guardan en `backend/uploads`
- `MAPBOX_ACCESS_TOKEN` / `VITE_MAPBOX_TOKEN`
- `OPENAI_API_KEY`

## Sprint 1

| HU | Alcance |
| --- | --- |
| HU-01 | Landing pública: hero, logo, destacadas, propuesta de valor, CTAs |
| HU-02 | Registro seguro `POST /api/auth/register` y `/register` |
| HU-03 | Login JWT, logout, refresh y recuperación de contraseña |
| HU-21 | Panel `/admin`, administradores, roles y permisos (RBAC) |
| HU-20 | CRUD de categorías (no se elimina si tiene experiencias) |
| HU-19 | CRUD de experiencias con estados DRAFT / PENDING / PUBLISHED / ARCHIVED |

## Equipo (GitHub)

Repo: [https://github.com/abaunzaaa/entre-caminos](https://github.com/abaunzaaa/entre-caminos.git)

| Persona | Sube |
| --- | --- |
| **Angie** | `main` (cimientos), HU-21 panel, HU-01 explorar |
| **Natalia** | HU-02 registro, HU-19 publicaciones |
| **Juliana** | HU-03 sesión, HU-20 categorías |

Comandos y orden: [docs/GITHUB.md](docs/GITHUB.md).

## Documentación

- [Base de datos](docs/database.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Seguridad](docs/SECURITY.md)
- [Historias y archivos](docs/HU-MAPPING.md)
- [Variables de entorno](docs/ENV.md)
- [Pruebas](docs/TESTING.md)
